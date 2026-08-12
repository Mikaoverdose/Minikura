package resources

import (
	"strings"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func TestServerAndProxyNames(t *testing.T) {
	if got := ServerName("smp"); got != "minecraft-smp" {
		t.Errorf("ServerName = %q", got)
	}
	if got := ProxyName(v1alpha1.ProxyVelocity, "edge"); got != "velocity-edge" {
		t.Errorf("ProxyName velocity = %q", got)
	}
	if got := ProxyName(v1alpha1.ProxyBungeeCord, "edge"); got != "bungeecord-edge" {
		t.Errorf("ProxyName bungee = %q", got)
	}
	if got := ConfigMapName("minecraft-smp"); got != "minecraft-smp-config" {
		t.Errorf("ConfigMapName = %q", got)
	}
}

func TestGeneratedNamesFitDNSLabelsAndRemainDistinct(t *testing.T) {
	name := strings.Repeat("a", 63)
	server := ServerName(name)
	config := ConfigMapName(server)
	proxy := ProxyName(v1alpha1.ProxyBungeeCord, name)
	for kind, got := range map[string]string{"server": server, "config": config, "proxy": proxy} {
		if len(got) > 63 {
			t.Errorf("%s name length = %d: %q", kind, len(got), got)
		}
		if strings.HasSuffix(got, "-") {
			t.Errorf("%s name has invalid suffix: %q", kind, got)
		}
	}
	if ServerName(name) == ServerName(strings.Repeat("a", 62)+"b") {
		t.Error("different long names collided")
	}
}

func TestLongResourceNamesProduceValidLabelValues(t *testing.T) {
	name := strings.Repeat("a", 63)
	mc := &v1alpha1.MinecraftServer{ObjectMeta: metav1.ObjectMeta{Name: name}}
	if got := ServerLabels(mc)[v1alpha1.LabelServerID]; len(got) > 63 {
		t.Errorf("server-id label length = %d", len(got))
	}
	rp := &v1alpha1.ReverseProxyServer{ObjectMeta: metav1.ObjectMeta{Name: name}}
	if got := ProxyLabels(rp)[v1alpha1.LabelProxyID]; len(got) > 63 {
		t.Errorf("proxy-id label length = %d", len(got))
	}
}

func TestServerLabels(t *testing.T) {
	mc := &v1alpha1.MinecraftServer{
		ObjectMeta: metav1.ObjectMeta{Name: "smp"},
		Spec:       v1alpha1.MinecraftServerSpec{Type: v1alpha1.ServerStateful},
	}
	labels := ServerLabels(mc)
	want := map[string]string{
		"app":                    "minecraft-smp",
		v1alpha1.LabelServerType: "stateful",
		v1alpha1.LabelServerID:   "smp",
		v1alpha1.LabelManagedBy:  v1alpha1.ManagerName,
	}
	for k, v := range want {
		if labels[k] != v {
			t.Errorf("label %s = %q, want %q", k, labels[k], v)
		}
	}
}

func TestProxyLabels(t *testing.T) {
	rp := &v1alpha1.ReverseProxyServer{
		ObjectMeta: metav1.ObjectMeta{Name: "edge"},
		Spec:       v1alpha1.ReverseProxyServerSpec{Type: v1alpha1.ProxyVelocity},
	}
	labels := ProxyLabels(rp)
	if labels["app"] != "velocity-edge" {
		t.Errorf("app = %q", labels["app"])
	}
	if labels[v1alpha1.LabelServerType] != "velocity" {
		t.Errorf("server-type = %q", labels[v1alpha1.LabelServerType])
	}
	if labels[v1alpha1.LabelProxyID] != "edge" {
		t.Errorf("proxy-id = %q", labels[v1alpha1.LabelProxyID])
	}
}
