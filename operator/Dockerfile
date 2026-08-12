ARG GO_VERSION=1.26.5
FROM golang:${GO_VERSION} AS build
WORKDIR /workspace

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ cmd/
COPY api/ api/
COPY internal/ internal/

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o operator ./cmd

FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=build /workspace/operator .
USER 65532:65532

ENTRYPOINT ["/operator"]
