#!/bin/bash
set -e

echo "=============================================="
echo "  Minikura Development Environment Setup"
echo "=============================================="

# sudo resolves the container hostname via DNS and stalls for seconds on each
# call until the name is in /etc/hosts.
if ! grep -q "$(hostname)" /etc/hosts 2>/dev/null; then
    echo "127.0.0.1 $(hostname)" | sudo -n tee -a /etc/hosts >/dev/null 2>&1 || true
fi

# Start Docker. systemd is PID 1 here, so `service` proxies to systemctl and
# blocks; --no-block plus an explicit wait keeps a failed unit from hanging.
echo "==> Starting Docker..."
sudo systemctl start --no-block docker 2>/dev/null || sudo service docker start &
for i in {1..30}; do
    [ -S /var/run/docker.sock ] && break
    sleep 1
done
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

# The k3s installer fetches the binary with a bare `curl -sfL` and no retry, so
# one transient reset aborts the whole install. Fetch it here with retries and
# hand it over via INSTALL_K3S_SKIP_DOWNLOAD.
K3S_VERSION="${K3S_VERSION:-v1.31.5+k3s1}"
K3S_ARCH=$(dpkg --print-architecture)
K3S_BIN_URL="https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION//+/%2B}/k3s"
[ "$K3S_ARCH" != "amd64" ] && K3S_BIN_URL="${K3S_BIN_URL}-${K3S_ARCH}"

echo "==> Downloading k3s ${K3S_VERSION} (${K3S_ARCH})..."
if ! sudo curl -fL --retry 5 --retry-delay 3 --retry-all-errors \
        --connect-timeout 20 --max-time 600 \
        -o /usr/local/bin/k3s "$K3S_BIN_URL"; then
    echo "[ERROR] Failed to download the k3s binary from:"
    echo "        $K3S_BIN_URL"
    echo "        Check container network access to github.com and retry."
    exit 1
fi
sudo chmod 755 /usr/local/bin/k3s

echo "==> Installing k3s..."
curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" \
    INSTALL_K3S_SKIP_DOWNLOAD=true \
    INSTALL_K3S_SKIP_START=true sh -

# Started separately from the installer so a unit that never activates surfaces
# as a timeout below rather than blocking the install indefinitely.
echo "==> Starting k3s..."
sudo systemctl enable --now --no-block k3s 2>/dev/null || sudo systemctl start k3s || true

echo "==> Waiting for k3s kubeconfig..."
mkdir -p /home/dev/.kube
for i in {1..90}; do
    [ -f /etc/rancher/k3s/k3s.yaml ] && break
    if [ "$i" -eq 90 ]; then
        echo "[ERROR] k3s did not write a kubeconfig within 90s."
        echo "        Check: sudo systemctl status k3s; sudo journalctl -xeu k3s"
        exit 1
    fi
    sleep 1
done

echo "==> Configuring kubectl..."
sudo cp /etc/rancher/k3s/k3s.yaml /home/dev/.kube/config
sudo chown dev:dev /home/dev/.kube/config
chmod 600 /home/dev/.kube/config

# Allow k3s self-signed certs
kubectl config set-cluster default --insecure-skip-tls-verify=true

# Wait for k3s API server to be fully ready
echo "==> Waiting for k3s API server..."
for i in {1..60}; do
    kubectl get nodes --request-timeout=2s >/dev/null 2>&1 && break
    echo "  Attempt $i/60..."
    sleep 1
done
sleep 2  # Extra buffer for stability

# Verify k3s is actually working
echo "==> Verifying k3s..."
kubectl get nodes || { echo "[ERROR] k3s not responding properly"; exit 1; }

echo "==> Waiting for node to be Ready..."
kubectl wait --for=condition=Ready node --all --timeout=120s \
    || echo "[WARN] node did not reach Ready; continuing"

echo "==> Creating minikura namespace..."
kubectl create namespace minikura --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

# Pods run inside k3s while the backend runs in the outer devcontainer. Expose
# the node address under the same service name used by production manifests.
echo "==> Exposing the development backend to k3s workloads..."
K3S_NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: minikura-backend
  namespace: minikura
spec:
  ports:
    - name: http
      port: 3000
      targetPort: 3000
---
apiVersion: v1
kind: Endpoints
metadata:
  name: minikura-backend
  namespace: minikura
subsets:
  - addresses:
      - ip: ${K3S_NODE_IP}
    ports:
      - name: http
        port: 3000
EOF

echo "==> Installing CRDs..."
make -C /workspace/operator install-crds 2>/dev/null \
    || echo "[WARN] CRD install failed; run 'bun run operator:crds'"

# Install dependencies
echo "==> Installing dependencies..."
cd /workspace
sudo rm -rf node_modules apps/*/node_modules packages/*/node_modules 2>/dev/null || true
sudo chown -R dev:dev /workspace
bun install

# Setup database
echo "==> Setting up database..."
bun run db:generate
bun run db:push
