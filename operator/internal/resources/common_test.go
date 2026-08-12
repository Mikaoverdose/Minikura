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
		{"default percent when unset", 2048, 0, "1638M"},
		{"explicit percent", 2048, 50, "1024M"},
		{"out of range falls back", 1024, 150, "819M"},
		{"floor applies to tiny limits", 128, 80, "256M"},
		{"full allocation", 1000, 100, "1000M"},
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

	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[len(got)-1].Value != "PAPER" {
		t.Errorf("last TYPE = %q, want PAPER", got[len(got)-1].Value)
	}
}
