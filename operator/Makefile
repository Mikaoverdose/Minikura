IMG ?= minikura-operator:latest
NAMESPACE ?= minikura
CONTROLLER_GEN ?= $(shell go env GOPATH)/bin/controller-gen

.PHONY: all
all: generate manifests fmt vet test build

.PHONY: controller-gen
controller-gen:
	@test -x $(CONTROLLER_GEN) || go install sigs.k8s.io/controller-tools/cmd/controller-gen@latest

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
	kubectl apply -f config/crd
	kubectl apply -n $(NAMESPACE) -f config/rbac
	kubectl apply -n $(NAMESPACE) -f config/manager
