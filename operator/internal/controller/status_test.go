package controller

import (
	"context"
	"errors"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func TestPhaseFromReady(t *testing.T) {
	if got := phaseFromReady(0); got != v1alpha1.PhasePending {
		t.Errorf("ready=0 -> %q, want Pending", got)
	}
	if got := phaseFromReady(1); got != v1alpha1.PhaseRunning {
		t.Errorf("ready=1 -> %q, want Running", got)
	}
}

func TestConditionStatus(t *testing.T) {
	if got := conditionStatus(true); got != metav1.ConditionTrue {
		t.Errorf("true -> %q", got)
	}
	if got := conditionStatus(false); got != metav1.ConditionFalse {
		t.Errorf("false -> %q", got)
	}
}

func TestSetConditionFillsReason(t *testing.T) {
	var conditions []metav1.Condition
	setCondition(&conditions, metav1.Condition{Type: v1alpha1.ConditionReady})
	if conditions[0].Reason != "Unknown" {
		t.Errorf("reason = %q, want Unknown", conditions[0].Reason)
	}
}

func TestFailWithStatusWrapsPatchError(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		SubResourcePatch: func(ctx context.Context, c client.Client, subResourceName string, obj client.Object, patch client.Patch, opts ...client.SubResourcePatchOption) error {
			return errors.New("status denied")
		},
	}, mc)
	_, err := failWithStatus(context.Background(), c, mc, errors.New("root cause"), func() {
		mc.Status.Phase = v1alpha1.PhaseFailed
	})
	if err == nil {
		t.Fatal("expected wrapped status patch error")
	}
	if !strings.Contains(err.Error(), "root cause") || !strings.Contains(err.Error(), "status denied") {
		t.Errorf("error = %v", err)
	}
}

func TestServiceEndpoint(t *testing.T) {
	tests := []struct {
		name string
		svc  *corev1.Service
		want string
	}{
		{
			name: "cluster ip",
			svc: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "minecraft-smp"},
				Spec: corev1.ServiceSpec{
					Type:  corev1.ServiceTypeClusterIP,
					Ports: []corev1.ServicePort{{Port: 25565}},
				},
			},
			want: "minecraft-smp.minikura.svc.cluster.local:25565",
		},
		{
			name: "load balancer hostname",
			svc: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "velocity-edge"},
				Spec: corev1.ServiceSpec{
					Type:  corev1.ServiceTypeLoadBalancer,
					Ports: []corev1.ServicePort{{Port: 25565}},
				},
				Status: corev1.ServiceStatus{
					LoadBalancer: corev1.LoadBalancerStatus{
						Ingress: []corev1.LoadBalancerIngress{{Hostname: "lb.example.com"}},
					},
				},
			},
			want: "lb.example.com:25565",
		},
		{
			name: "load balancer ip",
			svc: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "velocity-edge"},
				Spec: corev1.ServiceSpec{
					Type:  corev1.ServiceTypeLoadBalancer,
					Ports: []corev1.ServicePort{{Port: 25565}},
				},
				Status: corev1.ServiceStatus{
					LoadBalancer: corev1.LoadBalancerStatus{
						Ingress: []corev1.LoadBalancerIngress{{IP: "1.2.3.4"}},
					},
				},
			},
			want: "1.2.3.4:25565",
		},
		{
			name: "load balancer pending",
			svc: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "velocity-edge"},
				Spec: corev1.ServiceSpec{
					Type:  corev1.ServiceTypeLoadBalancer,
					Ports: []corev1.ServicePort{{Port: 25565}},
				},
			},
			want: "",
		},
		{
			name: "node port assigned",
			svc: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "minecraft-smp"},
				Spec: corev1.ServiceSpec{
					Type:  corev1.ServiceTypeNodePort,
					Ports: []corev1.ServicePort{{Port: 25565, NodePort: 30123}},
				},
			},
			want: "<node-ip>:30123",
		},
		{
			name: "node port unassigned",
			svc: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{Name: "minecraft-smp"},
				Spec: corev1.ServiceSpec{
					Type:  corev1.ServiceTypeNodePort,
					Ports: []corev1.ServicePort{{Port: 25565}},
				},
			},
			want: "minecraft-smp.minikura.svc.cluster.local",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := serviceEndpoint(tt.svc, "minikura"); got != tt.want {
				t.Errorf("serviceEndpoint() = %q, want %q", got, tt.want)
			}
		})
	}
}
