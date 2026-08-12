#!/bin/bash
# Minikura Installer

set -e

NAMESPACE="${KUBERNETES_NAMESPACE:-minikura}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔════════════════════════════════════════════════╗"
echo "║       Minikura Kubernetes Installer            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "-> Checking prerequisites..."
if ! command -v kubectl &> /dev/null; then
    echo "[WARN] kubectl not found. Skipping k8s setup."
    echo "[INFO] Install kubectl and run 'bash scripts/install.sh' manually when ready."
    exit 0
fi

if ! kubectl cluster-info &> /dev/null; then
    echo "[WARN] Cannot connect to Kubernetes cluster. Skipping k8s setup."
    echo "[INFO] Run 'bash scripts/install.sh' manually when cluster is ready."
    exit 0
fi

echo "[OK] kubectl found"
echo "[OK] Connected to Kubernetes cluster"
echo ""

# Create namespace
echo "-> Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo ""

# Apply CRDs and operator RBAC
echo "-> Installing operator CRDs"
make -C "$PROJECT_ROOT/operator" install-crds
echo "[OK] CRDs installed"
echo ""

echo "-> Setting up Go operator RBAC"
kubectl apply -f "$PROJECT_ROOT/operator/config/rbac/role.yaml"
kubectl apply -n "$NAMESPACE" -f "$PROJECT_ROOT/operator/config/rbac/service_account.yaml"
kubectl apply -n "$NAMESPACE" -f "$PROJECT_ROOT/operator/config/rbac/backend.yaml"
kubectl patch clusterrolebinding minikura-operator-rolebinding --type=json \
    -p="[{\"op\":\"replace\",\"path\":\"/subjects/0/namespace\",\"value\":\"$NAMESPACE\"}]"
kubectl patch clusterrolebinding minikura-backend-operator-resources --type=json \
    -p="[{\"op\":\"replace\",\"path\":\"/subjects/0/namespace\",\"value\":\"$NAMESPACE\"}]"
echo "[OK] Operator RBAC configured"
echo ""

echo "╔════════════════════════════════════════════════╗"
echo "║              Installation Complete             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Resources created:"
echo "  [OK] Namespace: $NAMESPACE"
echo "  [OK] ServiceAccount: minikura-operator"
echo "  [OK] ClusterRole + ClusterRoleBinding"
echo ""
echo "Next steps:"
echo "  bun run dev      - Start backend + web"
echo "  bun run operator:dev - Start Go operator"
echo ""
