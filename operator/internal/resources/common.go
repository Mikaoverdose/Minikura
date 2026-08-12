package resources

import (
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

const (
	MinecraftImage     = "itzg/minecraft-server"
	ProxyImage         = "itzg/mc-proxy:latest"
	ContainerPort      = 25565
	DefaultHeapPercent = 80
)

func ServiceType(exposure v1alpha1.ServiceExposure, fallback corev1.ServiceType) corev1.ServiceType {
	switch exposure {
	case v1alpha1.ExposureClusterIP:
		return corev1.ServiceTypeClusterIP
	case v1alpha1.ExposureNodePort:
		return corev1.ServiceTypeNodePort
	case v1alpha1.ExposureLoadBalancer:
		return corev1.ServiceTypeLoadBalancer
	default:
		return fallback
	}
}

func HeapMB(limitMB int32, heapPercent int32) string {
	if heapPercent <= 0 || heapPercent > 100 {
		heapPercent = DefaultHeapPercent
	}
	heap := int64(limitMB) * int64(heapPercent) / 100
	if heap < 256 {
		heap = 256
	}
	return fmt.Sprintf("%dM", heap)
}

func ResourceRequirements(r v1alpha1.Resources) corev1.ResourceRequirements {
	limitMB := r.MemoryLimitMB
	if limitMB <= 0 {
		limitMB = 2048
	}
	requestMB := r.MemoryRequestMB
	if requestMB <= 0 || requestMB > limitMB {
		requestMB = limitMB
	}

	requests := corev1.ResourceList{
		corev1.ResourceMemory: resource.MustParse(fmt.Sprintf("%dMi", requestMB)),
	}
	limits := corev1.ResourceList{
		corev1.ResourceMemory: resource.MustParse(fmt.Sprintf("%dMi", limitMB)),
	}

	if r.CPURequest != "" {
		if q, err := resource.ParseQuantity(r.CPURequest); err == nil {
			requests[corev1.ResourceCPU] = q
		}
	}
	if r.CPULimit != "" {
		if q, err := resource.ParseQuantity(r.CPULimit); err == nil {
			limits[corev1.ResourceCPU] = q
		}
	}

	return corev1.ResourceRequirements{Requests: requests, Limits: limits}
}

func JVMEnv(jvm v1alpha1.JVMOptions, limitMB int32) []corev1.EnvVar {
	env := []corev1.EnvVar{
		{Name: "MEMORY", Value: HeapMB(limitMB, jvm.HeapPercent)},
	}
	if jvm.Opts != "" {
		env = append(env, corev1.EnvVar{Name: "JVM_OPTS", Value: jvm.Opts})
	}
	if jvm.UseAikarFlags {
		env = append(env, corev1.EnvVar{Name: "USE_AIKAR_FLAGS", Value: "true"})
	}
	if jvm.UseMeowIceFlags {
		env = append(env, corev1.EnvVar{Name: "USE_MEOWICE_FLAGS", Value: "true"})
	}
	return env
}

func UserEnv(base []corev1.EnvVar, extra []v1alpha1.EnvVar) []corev1.EnvVar {
	for _, e := range extra {
		base = append(base, corev1.EnvVar{Name: e.Name, Value: e.Value})
	}
	return base
}

func TCPProbe(initialDelay int32) *corev1.Probe {
	return &corev1.Probe{
		ProbeHandler: corev1.ProbeHandler{
			TCPSocket: &corev1.TCPSocketAction{
				Port: intstr.FromInt32(ContainerPort),
			},
		},
		InitialDelaySeconds: initialDelay,
		PeriodSeconds:       10,
	}
}

func ObjectMeta(name, namespace string, labels map[string]string) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:      name,
		Namespace: namespace,
		Labels:    labels,
	}
}

func BoolValue(b *bool, fallback bool) bool {
	if b == nil {
		return fallback
	}
	return *b
}
