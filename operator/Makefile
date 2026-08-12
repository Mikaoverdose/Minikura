IMG ?= minikura-operator:latest
NAMESPACE ?= minikura
CONTROLLER_GEN_VERSION ?= v0.20.0
CONTROLLER_GEN ?= $(shell go env GOPATH)/bin/controller-gen

.PHONY: all
all: generate manifests fmt vet test build

.PHONY: controller-gen
controller-gen:
	@test -x $(CONTROLLER_GEN) || go install sigs.k8s.io/controller-tools/cmd/controller-gen@$(CONTROLLER_GEN_VERSION)

.PHONY: generate
generate: controller-gen
	$(CONTROLLER_GEN) object:headerFile=/dev/null paths=./api/...

.PHONY: manifests
manifests: controller-gen
	$(CONTROLLER_GEN) crd paths=./api/... output:crd:artifacts:config=config/crd
	$(CONTROLLER_GEN) rbac:roleName=minikura-operator-role paths=./internal/... output:rbac:artifacts:config=config/rbac

.PHONY: fmt
fmt:
	go fmt ./...

.PHONY: vet
vet:
	go vet ./...

.PHONY: test
test:
	go test ./... -race

.PHONY: build
build:
	go build -o bin/operator ./cmd

.PHONY: run
run:
	go run ./cmd --leader-elect=false

.PHONY: docker-build
docker-build:
	docker build -t $(IMG) .

.PHONY: install-crds
install-crds: manifests
	kubectl apply -f config/crd

.PHONY: uninstall-crds
uninstall-crds:
	kubectl delete --ignore-not-found -f config/crd

.PHONY: deploy
deploy: manifests
	kubectl create namespace $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -f config/crd
	kubectl apply -f config/rbac/role.yaml
	kubectl apply -n $(NAMESPACE) -f config/rbac/service_account.yaml
	kubectl apply -n $(NAMESPACE) -f config/rbac/backend.yaml
	kubectl patch clusterrolebinding minikura-operator-rolebinding --type=json -p='[{"op":"replace","path":"/subjects/0/namespace","value":"$(NAMESPACE)"}]'
	kubectl patch clusterrolebinding minikura-backend-operator-resources --type=json -p='[{"op":"replace","path":"/subjects/0/namespace","value":"$(NAMESPACE)"}]'
	sed 's|minikura-operator:latest|$(IMG)|' config/manager/deployment.yaml | kubectl apply -n $(NAMESPACE) -f -
