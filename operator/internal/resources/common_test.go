package resources

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func TestHeapMB(t *testing.T) {
	tests := []struct {
		name        string
		limitMB     int32
		heapPercent int32
		want        string
	}{
		{"default percent when unset", 2048, 0, "1228M"},
		{"explicit percent", 2048, 50, "1024M"},
		{"out of range falls back", 1024, 150, "614M"},
		{"floor applies to tiny limits", 128, 80, "256M"},
		{"full allocation", 1000, 100, "1000M"},
		{"zero limit uses default memory", 0, 60, "1228M"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HeapMB(tt.limitMB, tt.heapPercent); got != tt.want {
				t.Errorf("HeapMB(%d, %d) = %q, want %q", tt.limitMB, tt.heapPercent, got, tt.want)
			}
		})
	}
}

func TestResourceRequirements(t *testing.T) {
	t.Run("request defaults to limit", func(t *testing.T) {
		got := ResourceRequirements(v1alpha1.Resources{MemoryLimitMB: 2048})
		want := resource.MustParse("2048Mi")
		if got.Requests.Memory().Cmp(want) != 0 {
			t.Errorf("request memory = %v, want %v", got.Requests.Memory(), &want)
		}
	})

	t.Run("request above limit is clamped", func(t *testing.T) {
		got := ResourceRequirements(v1alpha1.Resources{MemoryLimitMB: 1024, MemoryRequestMB: 4096})
		want := resource.MustParse("1024Mi")
		if got.Requests.Memory().Cmp(want) != 0 {
			t.Errorf("request memory = %v, want %v", got.Requests.Memory(), &want)
		}
	})

	t.Run("zero memory uses default", func(t *testing.T) {
		got := ResourceRequirements(v1alpha1.Resources{})
		want := resource.MustParse("2048Mi")
		if got.Limits.Memory().Cmp(want) != 0 {
			t.Errorf("limit memory = %v, want %v", got.Limits.Memory(), &want)
		}
	})

	t.Run("explicit request below limit is kept", func(t *testing.T) {
		got := ResourceRequirements(v1alpha1.Resources{MemoryLimitMB: 4096, MemoryRequestMB: 1024})
		want := resource.MustParse("1024Mi")
		if got.Requests.Memory().Cmp(want) != 0 {
			t.Errorf("request memory = %v, want %v", got.Requests.Memory(), &want)
		}
	})

	t.Run("valid cpu request is kept", func(t *testing.T) {
		got := ResourceRequirements(v1alpha1.Resources{MemoryLimitMB: 1024, CPURequest: "250m"})
		if got.Requests.Cpu().String() != "250m" {
			t.Errorf("cpu request = %v, want 250m", got.Requests.Cpu())
		}
	})

	t.Run("invalid cpu strings are dropped", func(t *testing.T) {
		got := ResourceRequirements(v1alpha1.Resources{
			MemoryLimitMB: 1024,
			CPURequest:    "not-a-quantity",
			CPULimit:      "500m",
		})
		if _, ok := got.Requests[corev1.ResourceCPU]; ok {
			t.Error("expected invalid cpu request to be omitted")
		}
		if got.Limits.Cpu().String() != "500m" {
			t.Errorf("cpu limit = %v, want 500m", got.Limits.Cpu())
		}
	})
}

func TestServiceType(t *testing.T) {
	if got := ServiceType("", corev1.ServiceTypeLoadBalancer); got != corev1.ServiceTypeLoadBalancer {
		t.Errorf("empty exposure = %v, want fallback LoadBalancer", got)
	}
	if got := ServiceType(v1alpha1.ExposureNodePort, corev1.ServiceTypeClusterIP); got != corev1.ServiceTypeNodePort {
		t.Errorf("NodePort exposure = %v, want NodePort", got)
	}
}

func TestUserEnvOverridesDefaults(t *testing.T) {
	base := []corev1.EnvVar{{Name: "TYPE", Value: "VANILLA"}}
	got := UserEnv(base, []v1alpha1.EnvVar{{Name: "TYPE", Value: "PAPER"}})

	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0].Value != "PAPER" {
		t.Errorf("TYPE = %q, want PAPER", got[0].Value)
	}
}

func TestUserEnvClearsValueFromOnOverride(t *testing.T) {
	base := []corev1.EnvVar{{
		Name: "MINIKURA_API_KEY",
		ValueFrom: &corev1.EnvVarSource{
			SecretKeyRef: &corev1.SecretKeySelector{Key: "api-key"},
		},
	}}
	got := UserEnv(base, []v1alpha1.EnvVar{{Name: "MINIKURA_API_KEY", Value: "inline"}})
	if got[0].Value != "inline" {
		t.Errorf("value = %q, want inline", got[0].Value)
	}
	if got[0].ValueFrom != nil {
		t.Error("ValueFrom should be cleared when overridden")
	}
}

func TestUserEnvSupportsValueFrom(t *testing.T) {
	extra := []v1alpha1.EnvVar{{
		Name:  "FROM_SECRET",
		Value: "ignored",
		ValueFrom: &corev1.EnvVarSource{SecretKeyRef: &corev1.SecretKeySelector{
			LocalObjectReference: corev1.LocalObjectReference{Name: "settings"},
			Key:                  "value",
		}},
	}}
	got := UserEnv(nil, extra)
	if len(got) != 1 || got[0].ValueFrom == nil || got[0].ValueFrom.SecretKeyRef == nil {
		t.Fatalf("valueFrom was not preserved: %+v", got)
	}
	if got[0].ValueFrom.SecretKeyRef.Name != "settings" {
		t.Errorf("secret name = %q", got[0].ValueFrom.SecretKeyRef.Name)
	}
	if got[0].Value != "" {
		t.Errorf("literal value = %q, want empty with valueFrom", got[0].Value)
	}
}

func TestUserEnvDoesNotOverrideProtectedValues(t *testing.T) {
	base := []corev1.EnvVar{{Name: "MINIKURA_API_KEY", Value: "managed"}}
	got := UserEnv(base, []v1alpha1.EnvVar{{Name: "MINIKURA_API_KEY", Value: "user"}}, "MINIKURA_API_KEY")
	if got[0].Value != "managed" {
		t.Errorf("protected value = %q, want managed", got[0].Value)
	}
}

func TestUserEnvAppendsUnknownKeys(t *testing.T) {
	base := []corev1.EnvVar{{Name: "TYPE", Value: "PAPER"}}
	got := UserEnv(base, []v1alpha1.EnvVar{{Name: "EXTRA", Value: "1"}})
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
}

func TestJVMEnv(t *testing.T) {
	env := JVMEnv(v1alpha1.JVMOptions{
		Opts:            "-XX:+UseG1GC",
		UseAikarFlags:   true,
		UseMeowIceFlags: true,
		HeapPercent:     70,
	}, 2048)

	want := map[string]string{
		"MEMORY":            "1433M",
		"JVM_OPTS":          "-XX:+UseG1GC",
		"USE_AIKAR_FLAGS":   "true",
		"USE_MEOWICE_FLAGS": "true",
	}
	for key, value := range want {
		got, ok := envValue(env, key)
		if !ok || got != value {
			t.Errorf("%s = %q, %v; want %q", key, got, ok, value)
		}
	}
}

func TestJVMEnvOmitsOptionalFlags(t *testing.T) {
	env := JVMEnv(v1alpha1.JVMOptions{}, 1024)
	if _, ok := envValue(env, "JVM_OPTS"); ok {
		t.Error("JVM_OPTS should be omitted")
	}
	if _, ok := envValue(env, "USE_AIKAR_FLAGS"); ok {
		t.Error("USE_AIKAR_FLAGS should be omitted")
	}
}

func TestTCPProbeDefaultsPort(t *testing.T) {
	probe := TCPProbe(15, 0)
	if probe.TCPSocket.Port.IntVal != ContainerPort {
		t.Errorf("port = %d, want %d", probe.TCPSocket.Port.IntVal, ContainerPort)
	}
	if probe.InitialDelaySeconds != 15 {
		t.Errorf("initialDelay = %d", probe.InitialDelaySeconds)
	}
}

func TestBoolValue(t *testing.T) {
	if !BoolValue(nil, true) {
		t.Error("nil should use fallback true")
	}
	f := false
	if BoolValue(&f, true) {
		t.Error("explicit false should win")
	}
}

func TestServiceTypeLoadBalancer(t *testing.T) {
	if got := ServiceType(v1alpha1.ExposureLoadBalancer, corev1.ServiceTypeClusterIP); got != corev1.ServiceTypeLoadBalancer {
		t.Errorf("got %v", got)
	}
	if got := ServiceType(v1alpha1.ExposureClusterIP, corev1.ServiceTypeLoadBalancer); got != corev1.ServiceTypeClusterIP {
		t.Errorf("got %v", got)
	}
}
