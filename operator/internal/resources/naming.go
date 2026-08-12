package resources

import (
	"fmt"
	"strings"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func ServerName(name string) string { return fmt.Sprintf("minecraft-%s", name) }
func ProxyName(kind v1alpha1.ProxyKind, name string) string {
	return fmt.Sprintf("%s-%s", strings.ToLower(string(kind)), name)
}
func ConfigMapName(base string) string { return base + "-config" }

func ServerLabels(mc *v1alpha1.MinecraftServer) map[string]string {
	return map[string]string{
		"app":                    ServerName(mc.Name),
		v1alpha1.LabelServerType: strings.ToLower(string(mc.Spec.Type)),
		v1alpha1.LabelServerID:   mc.Name,
		v1alpha1.LabelManagedBy:  v1alpha1.ManagerName,
	}
}

func ProxyLabels(rp *v1alpha1.ReverseProxyServer) map[string]string {
	return map[string]string{
		"app":                    ProxyName(rp.Spec.Type, rp.Name),
		v1alpha1.LabelServerType: strings.ToLower(string(rp.Spec.Type)),
		v1alpha1.LabelProxyID:    rp.Name,
		v1alpha1.LabelManagedBy:  v1alpha1.ManagerName,
	}
}

func SelectorLabels(app string) map[string]string {
	return map[string]string{"app": app}
}
