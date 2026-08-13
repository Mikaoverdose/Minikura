package resources

import (
	"fmt"
	"strconv"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func MinecraftConfigMap(mc *v1alpha1.MinecraftServer) *corev1.ConfigMap {
	name := ServerName(mc.Name)
	return &corev1.ConfigMap{
		ObjectMeta: ObjectMeta(ConfigMapName(name), mc.Namespace, ServerLabels(mc)),
		Data: map[string]string{
			"server-type":       string(mc.Spec.Type),
			"minecraft-version": mc.Spec.MinecraftVersion,
			"jar-type":          string(mc.Spec.JarType),
		},
	}
}

func MinecraftService(mc *v1alpha1.MinecraftServer) *corev1.Service {
	name := ServerName(mc.Name)
	port := corev1.ServicePort{
		Name:       "minecraft",
		Port:       mc.Spec.ListenPort,
		TargetPort: intstr.FromInt32(ContainerPort),
		Protocol:   corev1.ProtocolTCP,
	}

	svcType := ServiceType(mc.Spec.ServiceType, corev1.ServiceTypeClusterIP)
	if svcType == corev1.ServiceTypeNodePort && mc.Spec.NodePort != 0 {
		port.NodePort = mc.Spec.NodePort
	}

	return &corev1.Service{
		ObjectMeta: ObjectMeta(name, mc.Namespace, ServerLabels(mc)),
		Spec: corev1.ServiceSpec{
			Selector: SelectorLabels(name),
			Ports:    []corev1.ServicePort{port},
			Type:     svcType,
		},
	}
}

func minecraftEnv(mc *v1alpha1.MinecraftServer) []corev1.EnvVar {
	p := mc.Spec.Properties

	env := []corev1.EnvVar{
		{Name: "EULA", Value: "TRUE"},
		{Name: "TYPE", Value: string(mc.Spec.JarType)},
		{Name: "VERSION", Value: mc.Spec.MinecraftVersion},
		{Name: "OVERRIDE_SERVER_PROPERTIES", Value: "true"},
		{Name: "ENABLE_RCON", Value: "false"},
		{Name: "DIFFICULTY", Value: string(p.Difficulty)},
		{Name: "MODE", Value: string(p.GameMode)},
		{Name: "MAX_PLAYERS", Value: strconv.Itoa(int(p.MaxPlayers))},
		{Name: "PVP", Value: strconv.FormatBool(BoolValue(p.PVP, true))},
		{Name: "ONLINE_MODE", Value: strconv.FormatBool(BoolValue(p.OnlineMode, true))},
	}

	if p.MOTD != "" {
		env = append(env, corev1.EnvVar{Name: "MOTD", Value: p.MOTD})
	}
	if p.LevelSeed != "" {
		env = append(env, corev1.EnvVar{Name: "SEED", Value: p.LevelSeed})
	}
	if p.LevelType != "" {
		env = append(env, corev1.EnvVar{Name: "LEVEL_TYPE", Value: p.LevelType})
	}

	env = append(env, JVMEnv(mc.Spec.JVM, mc.Spec.Resources.MemoryLimitMB)...)

	if mc.Spec.APIKeySecretRef != "" {
		env = append(env, corev1.EnvVar{
			Name: "MINIKURA_API_KEY",
			ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: mc.Spec.APIKeySecretRef},
					Key:                  "api-key",
				},
			},
		})
	}

	return UserEnv(env, mc.Spec.Env, "EULA", "MINIKURA_API_KEY")
}

func minecraftPodSpec(mc *v1alpha1.MinecraftServer, stateful bool) corev1.PodSpec {
	name := ServerName(mc.Name)

	mounts := []corev1.VolumeMount{{Name: "config", MountPath: "/config"}}
	volumes := []corev1.Volume{{
		Name: "config",
		VolumeSource: corev1.VolumeSource{
			ConfigMap: &corev1.ConfigMapVolumeSource{
				LocalObjectReference: corev1.LocalObjectReference{Name: ConfigMapName(name)},
			},
		},
	}}

	initialDelay := int32(30)
	if stateful {
		mounts = append(mounts, corev1.VolumeMount{Name: "data", MountPath: "/data"})
		initialDelay = 60
	}

	return corev1.PodSpec{
		Containers: []corev1.Container{{
			Name:    "minecraft",
			Image:   MinecraftImage,
			Command: []string{"/bin/sh", "-c"},
			Args: []string{
				"rm -f /tmp/minikura-console && mkfifo /tmp/minikura-console && exec 3<>/tmp/minikura-console && exec /start <&3",
			},
			Ports: []corev1.ContainerPort{{
				Name:          "minecraft",
				ContainerPort: ContainerPort,
			}},
			Env:            minecraftEnv(mc),
			VolumeMounts:   mounts,
			ReadinessProbe: TCPProbe(initialDelay, ContainerPort),
			Resources:      ResourceRequirements(mc.Spec.Resources),
		}},
		Volumes: volumes,
	}
}

func MinecraftDeployment(mc *v1alpha1.MinecraftServer) *appsv1.Deployment {
	name := ServerName(mc.Name)
	labels := ServerLabels(mc)

	replicas := int32(1)
	if mc.Spec.Running != nil && !*mc.Spec.Running {
		replicas = 0
	}
	return &appsv1.Deployment{
		ObjectMeta: ObjectMeta(name, mc.Namespace, labels),
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr(replicas),
			Selector: &metav1.LabelSelector{MatchLabels: SelectorLabels(name)},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec:       minecraftPodSpec(mc, false),
			},
		},
	}
}

func MinecraftStatefulSet(mc *v1alpha1.MinecraftServer) (*appsv1.StatefulSet, error) {
	name := ServerName(mc.Name)
	labels := ServerLabels(mc)

	size := mc.Spec.StorageSize
	if size == "" {
		size = "1Gi"
	}
	qty, err := resource.ParseQuantity(size)
	if err != nil {
		return nil, fmt.Errorf("invalid storageSize %q: %w", size, err)
	}

	replicas := int32(1)
	if mc.Spec.Running != nil && !*mc.Spec.Running {
		replicas = 0
	}
	return &appsv1.StatefulSet{
		ObjectMeta: ObjectMeta(name, mc.Namespace, labels),
		Spec: appsv1.StatefulSetSpec{
			ServiceName: name,
			Replicas:    ptr(replicas),
			Selector:    &metav1.LabelSelector{MatchLabels: SelectorLabels(name)},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec:       minecraftPodSpec(mc, true),
			},
			VolumeClaimTemplates: []corev1.PersistentVolumeClaim{{
				ObjectMeta: metav1.ObjectMeta{Name: "data"},
				Spec: corev1.PersistentVolumeClaimSpec{
					AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
					Resources: corev1.VolumeResourceRequirements{
						Requests: corev1.ResourceList{corev1.ResourceStorage: qty},
					},
				},
			}},
		},
	}, nil
}
