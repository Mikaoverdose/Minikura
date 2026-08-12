package resources

import (
	"crypto/sha256"
	"fmt"
	"strings"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

const dnsLabelMaxLength = 63

func ServerName(name string) string { return limitedName("minecraft-"+name, dnsLabelMaxLength) }
func ProxyName(kind v1alpha1.ProxyKind, name string) string {
	return limitedName(fmt.Sprintf("%s-%s", strings.ToLower(string(kind)), name), dnsLabelMaxLength)
}
func ConfigMapName(base string) string { return limitedName(base+"-config", dnsLabelMaxLength) }

func limitedName(name string, limit int) string {
	if len(name) <= limit {
		return name
	}
	sum := sha256.Sum256([]byte(name))
	suffix := fmt.Sprintf("-%x", sum[:4])
	return strings.TrimRight(name[:limit-len(suffix)], "-") + suffix
}

func labelValue(value string) string {
	return limitedName(value, dnsLabelMaxLength)
}

func ServerLabels(mc *v1alpha1.MinecraftServer) map[string]string {
	return map[string]string{
		"app":                    ServerName(mc.Name),
		v1alpha1.LabelServerType: strings.ToLower(string(mc.Spec.Type)),
		v1alpha1.LabelServerID:   labelValue(mc.Name),
		v1alpha1.LabelManagedBy:  v1alpha1.ManagerName,
	}
}

func ProxyLabels(rp *v1alpha1.ReverseProxyServer) map[string]string {
	return map[string]string{
		"app":                    ProxyName(rp.Spec.Type, rp.Name),
		v1alpha1.LabelServerType: strings.ToLower(string(rp.Spec.Type)),
		v1alpha1.LabelProxyID:    labelValue(rp.Name),
		v1alpha1.LabelManagedBy:  v1alpha1.ManagerName,
	}
}

func SelectorLabels(app string) map[string]string {
	return map[string]string{"app": app}
}
