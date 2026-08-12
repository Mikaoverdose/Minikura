package resources

import (
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func testProxy() *v1alpha1.ReverseProxyServer {
	return &v1alpha1.ReverseProxyServer{
		ObjectMeta: metav1.ObjectMeta{Name: "edge", Namespace: "minikura"},
		Spec: v1alpha1.ReverseProxyServerSpec{
			Type:            v1alpha1.ProxyVelocity,
			ExternalAddress: "play.example.com",
			ExternalPort:    25565,
			ListenPort:      25577,
			Resources:       v1alpha1.Resources{MemoryLimitMB: 512},
		},
	}
}

func TestProxyDeploymentUsesProxyImage(t *testing.T) {
	container := ProxyDeployment(testProxy()).Spec.Template.Spec.Containers[0]
	if container.Image != ProxyImage {
		t.Errorf("image = %q, want %q", container.Image, ProxyImage)
	}
}

func TestProxyEnvCarriesRuntimeConfig(t *testing.T) {
	env := proxyEnv(testProxy())
	for _, want := range []struct{ key, value string }{
		{"TYPE", "VELOCITY"},
		{"NETWORKADDRESS_CACHE_TTL", "30"},
		{"MINIKURA_EXTERNAL_ADDRESS", "play.example.com"},
	} {
		got, ok := envValue(env, want.key)
		if !ok || got != want.value {
			t.Errorf("%s = %q, %v; want %q", want.key, got, ok, want.value)
		}
	}
}
