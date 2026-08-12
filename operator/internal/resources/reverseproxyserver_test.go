package resources

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
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

func TestProxyConfigMap(t *testing.T) {
	cm := ProxyConfigMap(testProxy())
	if cm.Name != "velocity-edge-config" {
		t.Errorf("name = %q", cm.Name)
	}
	if cm.Data["proxy-type"] != "VELOCITY" || cm.Data["external-address"] != "play.example.com" {
		t.Errorf("data = %v", cm.Data)
	}
}

func TestProxyService(t *testing.T) {
	rp := testProxy()
	svc := ProxyService(rp)
	if svc.Spec.Type != corev1.ServiceTypeLoadBalancer {
		t.Errorf("type = %v", svc.Spec.Type)
	}
	if svc.Spec.Ports[0].Port != 25565 {
		t.Errorf("port = %d", svc.Spec.Ports[0].Port)
	}
	if svc.Spec.Ports[0].TargetPort.IntVal != 25577 {
		t.Errorf("targetPort = %d", svc.Spec.Ports[0].TargetPort.IntVal)
	}
}

func TestProxyServiceNodePort(t *testing.T) {
	rp := testProxy()
	rp.Spec.ServiceType = v1alpha1.ExposureNodePort
	rp.Spec.NodePort = 30555
	svc := ProxyService(rp)
	if svc.Spec.Type != corev1.ServiceTypeNodePort {
		t.Errorf("type = %v", svc.Spec.Type)
	}
	if svc.Spec.Ports[0].NodePort != 30555 {
		t.Errorf("nodePort = %d", svc.Spec.Ports[0].NodePort)
	}
}

func TestProxyDeploymentListenPortAndProbe(t *testing.T) {
	dep := ProxyDeployment(testProxy())
	container := dep.Spec.Template.Spec.Containers[0]
	if container.Ports[0].ContainerPort != 25577 {
		t.Errorf("containerPort = %d", container.Ports[0].ContainerPort)
	}
	if container.ReadinessProbe == nil || container.ReadinessProbe.TCPSocket == nil {
		t.Fatal("expected TCP readiness probe")
	}
	if container.ReadinessProbe.TCPSocket.Port.IntVal != 25577 {
		t.Errorf("probe port = %d", container.ReadinessProbe.TCPSocket.Port.IntVal)
	}
}

func TestProxyAPIKeyEnv(t *testing.T) {
	rp := testProxy()
	rp.Spec.APIKeySecretRef = "proxy-key"
	env := proxyEnv(rp)
	found := false
	for _, e := range env {
		if e.Name == "MINIKURA_API_KEY" {
			found = true
			if e.ValueFrom == nil || e.ValueFrom.SecretKeyRef.Name != "proxy-key" {
				t.Errorf("secret ref = %+v", e.ValueFrom)
			}
			if e.ValueFrom.SecretKeyRef.Optional != nil {
				t.Error("API key Secret must be required")
			}
		}
	}
	if !found {
		t.Error("MINIKURA_API_KEY missing")
	}
}

func TestProxyPluginBackendWiring(t *testing.T) {
	rp := testProxy()
	rp.Spec.APIKeySecretRef = "proxy-key"
	rp.Spec.BackendURL = "https://backend.example.com/api/"
	rp.Spec.PluginURL = "https://downloads.example.com/minikura.jar"
	rp.Spec.Env = []v1alpha1.EnvVar{
		{Name: "MINIKURA_API_URL", Value: "http://attacker"},
		{Name: "PLUGINS", Value: "http://attacker/plugin.jar"},
	}
	env := proxyEnv(rp)
	want := map[string]string{
		"MINIKURA_API_URL":       "https://backend.example.com/api",
		"MINIKURA_WEBSOCKET_URL": "wss://backend.example.com/api/servers/ws",
		"PLUGINS":                "https://downloads.example.com/minikura.jar",
	}
	for name, value := range want {
		if got, ok := envValue(env, name); !ok || got != value {
			t.Errorf("%s = %q, %v; want %q", name, got, ok, value)
		}
	}
}

func TestBungeeCordDoesNotInstallVelocityPlugin(t *testing.T) {
	rp := testProxy()
	rp.Spec.Type = v1alpha1.ProxyBungeeCord
	rp.Spec.PluginURL = "https://downloads.example.com/minikura.jar"
	if _, ok := envValue(proxyEnv(rp), "PLUGINS"); ok {
		t.Error("Velocity plugin must not be installed on BungeeCord")
	}
}

func TestProxyLegacyEnvWiringRemainsAvailableWhenFieldsAreUnset(t *testing.T) {
	rp := testProxy()
	rp.Spec.Env = []v1alpha1.EnvVar{
		{Name: "MINIKURA_API_URL", Value: "http://legacy-backend/api"},
		{Name: "PLUGINS", Value: "http://legacy/plugin.jar"},
	}
	env := proxyEnv(rp)
	if got, _ := envValue(env, "MINIKURA_API_URL"); got != "http://legacy-backend/api" {
		t.Errorf("legacy API URL = %q", got)
	}
	if got, _ := envValue(env, "PLUGINS"); got != "http://legacy/plugin.jar" {
		t.Errorf("legacy plugin URL = %q", got)
	}
}
