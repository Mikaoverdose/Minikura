#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${KUBERNETES_NAMESPACE:-minikura}"
OPERATOR_IMAGE="${OPERATOR_IMAGE:-minikura-operator:latest}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-120s}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

case "$NAMESPACE" in
    ''|*[!a-z0-9-]*|-*|*-) echo "[ERROR] KUBERNETES_NAMESPACE must be a DNS label" >&2; exit 1 ;;
esac
if (( ${#NAMESPACE} > 63 )); then
    echo "[ERROR] KUBERNETES_NAMESPACE must not exceed 63 characters" >&2
    exit 1
fi

echo "╔════════════════════════════════════════════════╗"
echo "║       Minikura Kubernetes Installer            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

echo "-> Checking prerequisites..."
if ! command -v kubectl &> /dev/null; then
    echo "[ERROR] kubectl is required" >&2
    exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
    echo "[ERROR] Cannot connect to the current Kubernetes cluster" >&2
    exit 1
fi

echo "[OK] kubectl found"
echo "[OK] Connected to Kubernetes cluster"
echo ""

echo "-> Creating namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
echo ""

echo "-> Installing operator CRDs"
kubectl apply -f "$PROJECT_ROOT/operator/config/crd"
echo "[OK] CRDs installed"
echo ""

echo "-> Configuring operator and backend RBAC"
# Remove bindings created by older releases before replacing them with namespaced access.
kubectl delete clusterrolebinding minikura-operator-rolebinding \
    minikura-backend-operator-resources --ignore-not-found
kubectl delete clusterrole minikura-backend-operator-resources --ignore-not-found
kubectl apply -f "$PROJECT_ROOT/operator/config/rbac/role.yaml"
sed "s/namespace: minikura/namespace: $NAMESPACE/g" \
    "$PROJECT_ROOT/operator/config/rbac/service_account.yaml" | kubectl apply -n "$NAMESPACE" -f -
sed "s/namespace: minikura/namespace: $NAMESPACE/g" \
    "$PROJECT_ROOT/operator/config/rbac/backend.yaml" | kubectl apply -n "$NAMESPACE" -f -
echo "[OK] RBAC configured"
echo ""

echo "-> Deploying operator: $OPERATOR_IMAGE"
kubectl set image -f "$PROJECT_ROOT/operator/config/manager/deployment.yaml" \
    operator="$OPERATOR_IMAGE" --local -o yaml | kubectl apply -n "$NAMESPACE" -f -
kubectl rollout restart -n "$NAMESPACE" deployment/minikura-operator
kubectl rollout status -n "$NAMESPACE" deployment/minikura-operator --timeout="$ROLLOUT_TIMEOUT"
echo "[OK] Operator deployed"
echo ""

echo "╔════════════════════════════════════════════════╗"
echo "║              Installation Complete             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Resources created:"
echo "  [OK] Namespace: $NAMESPACE"
echo "  [OK] ServiceAccount: minikura-operator"
echo "  [OK] ServiceAccount: minikura-backend"
echo "  [OK] Operator Deployment: $OPERATOR_IMAGE"
echo ""
echo "Next steps:"
echo "  Configure an in-cluster backend Deployment to use serviceAccountName: minikura-backend"
echo ""
