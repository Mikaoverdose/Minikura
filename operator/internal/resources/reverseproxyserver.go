package resources

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func ProxyConfigMap(rp *v1alpha1.ReverseProxyServer) *corev1.ConfigMap {
	name := ProxyName(rp.Spec.Type, rp.Name)
	return &corev1.ConfigMap{
		ObjectMeta: ObjectMeta(ConfigMapName(name), rp.Namespace, ProxyLabels(rp)),
		Data: map[string]string{
			"proxy-type":       string(rp.Spec.Type),
			"external-address": rp.Spec.ExternalAddress,
		},
	}
}

func ProxyService(rp *v1alpha1.ReverseProxyServer) *corev1.Service {
	name := ProxyName(rp.Spec.Type, rp.Name)
	port := corev1.ServicePort{
		Name:       "minecraft",
		Port:       rp.Spec.ExternalPort,
		TargetPort: intstr.FromInt32(rp.Spec.ListenPort),
		Protocol:   corev1.ProtocolTCP,
	}

	svcType := ServiceType(rp.Spec.ServiceType, corev1.ServiceTypeLoadBalancer)
	if svcType == corev1.ServiceTypeNodePort && rp.Spec.NodePort != 0 {
		port.NodePort = rp.Spec.NodePort
	}

	return &corev1.Service{
		ObjectMeta: ObjectMeta(name, rp.Namespace, ProxyLabels(rp)),
		Spec: corev1.ServiceSpec{
			Selector: SelectorLabels(name),
			Ports:    []corev1.ServicePort{port},
			Type:     svcType,
		},
	}
}

func proxyEnv(rp *v1alpha1.ReverseProxyServer) []corev1.EnvVar {
	env := []corev1.EnvVar{
		{Name: "TYPE", Value: string(rp.Spec.Type)},
		{Name: "NETWORKADDRESS_CACHE_TTL", Value: "30"},
		{Name: "MINIKURA_EXTERNAL_ADDRESS", Value: rp.Spec.ExternalAddress},
	}

	env = append(env, JVMEnv(rp.Spec.JVM, rp.Spec.Resources.MemoryLimitMB)...)

	if rp.Spec.APIKeySecretRef != "" {
		env = append(env, corev1.EnvVar{
			Name: "MINIKURA_API_KEY",
			ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: rp.Spec.APIKeySecretRef},
					Key:                  "api-key",
					Optional:             ptr(true),
				},
			},
		})
	}

	return UserEnv(env, rp.Spec.Env)
}

func ProxyDeployment(rp *v1alpha1.ReverseProxyServer) *appsv1.Deployment {
	name := ProxyName(rp.Spec.Type, rp.Name)
	labels := ProxyLabels(rp)

	return &appsv1.Deployment{
		ObjectMeta: ObjectMeta(name, rp.Namespace, labels),
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr(int32(1)),
			Selector: &metav1.LabelSelector{MatchLabels: SelectorLabels(name)},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{
						Name:  "proxy",
						Image: ProxyImage,
						Ports: []corev1.ContainerPort{{
							Name:          "minecraft",
							ContainerPort: rp.Spec.ListenPort,
						}},
						Env: proxyEnv(rp),
						VolumeMounts: []corev1.VolumeMount{
							{Name: "config", MountPath: "/config"},
						},
						ReadinessProbe: TCPProbe(30, rp.Spec.ListenPort),
						Resources: ResourceRequirements(rp.Spec.Resources),
					}},
					Volumes: []corev1.Volume{{
						Name: "config",
						VolumeSource: corev1.VolumeSource{
							ConfigMap: &corev1.ConfigMapVolumeSource{
								LocalObjectReference: corev1.LocalObjectReference{
									Name: ConfigMapName(name),
								},
							},
						},
					}},
				},
			},
		},
	}
}
