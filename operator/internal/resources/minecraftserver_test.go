package resources

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func testServer() *v1alpha1.MinecraftServer {
	return &v1alpha1.MinecraftServer{
		ObjectMeta: metav1.ObjectMeta{Name: "smp", Namespace: "minikura"},
		Spec: v1alpha1.MinecraftServerSpec{
			Type:             v1alpha1.ServerStateful,
			ListenPort:       25565,
			ServiceType:      v1alpha1.ExposureClusterIP,
			JarType:          "PAPER",
			MinecraftVersion: "1.20.4",
			StorageSize:      "10Gi",
			Resources:        v1alpha1.Resources{MemoryLimitMB: 4096},
		},
	}
}

func envValue(env []corev1.EnvVar, name string) (string, bool) {
	for i := len(env) - 1; i >= 0; i-- {
		if env[i].Name == name {
			return env[i].Value, true
		}
	}
	return "", false
}

func TestMinecraftEnvCarriesSpecConfig(t *testing.T) {
	mc := testServer()
	mc.Spec.Properties = v1alpha1.MinecraftProperties{
		Difficulty: "HARD",
		GameMode:   "SURVIVAL",
		MaxPlayers: 50,
		MOTD:       "welcome",
	}

	env := minecraftEnv(mc)

	for _, want := range []struct{ key, value string }{
		{"TYPE", "PAPER"},
		{"VERSION", "1.20.4"},
		{"DIFFICULTY", "HARD"},
		{"MAX_PLAYERS", "50"},
		{"MOTD", "welcome"},
	} {
		got, ok := envValue(env, want.key)
		if !ok {
			t.Errorf("%s missing from env", want.key)
			continue
		}
		if got != want.value {
			t.Errorf("%s = %q, want %q", want.key, got, want.value)
		}
	}
}

func TestOptionalPropertiesOmitted(t *testing.T) {
	env := minecraftEnv(testServer())
	for _, key := range []string{"MOTD", "SEED", "LEVEL_TYPE"} {
		if _, ok := envValue(env, key); ok {
			t.Errorf("%s should be omitted when unset", key)
		}
	}
}

func TestServiceNodePortPinned(t *testing.T) {
	mc := testServer()
	mc.Spec.ServiceType = v1alpha1.ExposureNodePort
	mc.Spec.NodePort = 30123

	svc := MinecraftService(mc)
	if svc.Spec.Type != corev1.ServiceTypeNodePort {
		t.Fatalf("type = %v, want NodePort", svc.Spec.Type)
	}
	if svc.Spec.Ports[0].NodePort != 30123 {
		t.Errorf("nodePort = %d, want 30123", svc.Spec.Ports[0].NodePort)
	}
}

func TestServiceNodePortUnsetLeavesAllocation(t *testing.T) {
	mc := testServer()
	mc.Spec.ServiceType = v1alpha1.ExposureNodePort

	svc := MinecraftService(mc)
	if svc.Spec.Ports[0].NodePort != 0 {
		t.Errorf("nodePort = %d, want 0 so the API server allocates one", svc.Spec.Ports[0].NodePort)
	}
}

func TestSelectorExcludesMutableLabels(t *testing.T) {
	mc := testServer()
	sts, err := MinecraftStatefulSet(mc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	selector := sts.Spec.Selector.MatchLabels
	if _, ok := selector[v1alpha1.LabelServerType]; ok {
		t.Error("selector must not include the mutable server-type label")
	}
	if selector["app"] != ServerName(mc.Name) {
		t.Errorf("selector app = %q, want %q", selector["app"], ServerName(mc.Name))
	}

	for k, v := range selector {
		if sts.Spec.Template.Labels[k] != v {
			t.Errorf("pod template missing selector label %s=%s", k, v)
		}
	}
}

func TestStatefulSetStorage(t *testing.T) {
	sts, err := MinecraftStatefulSet(testServer())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	claims := sts.Spec.VolumeClaimTemplates
	if len(claims) != 1 {
		t.Fatalf("volumeClaimTemplates = %d, want 1", len(claims))
	}
	if got := claims[0].Spec.Resources.Requests.Storage().String(); got != "10Gi" {
		t.Errorf("storage = %s, want 10Gi", got)
	}
}

func TestStatefulSetRejectsBadStorageSize(t *testing.T) {
	mc := testServer()
	mc.Spec.StorageSize = "ten-gigs"

	if _, err := MinecraftStatefulSet(mc); err == nil {
		t.Error("expected an error for an unparseable storageSize")
	}
}

func TestStatelessHasNoDataVolume(t *testing.T) {
	mc := testServer()
	mc.Spec.Type = v1alpha1.ServerStateless

	dep := MinecraftDeployment(mc)
	for _, m := range dep.Spec.Template.Spec.Containers[0].VolumeMounts {
		if m.Name == "data" {
			t.Error("stateless server should not mount a data volume")
		}
	}
}
