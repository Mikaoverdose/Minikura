package controller

import (
	"context"
	"encoding/json"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/apiutil"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func TestTypedObjectMarshalsWithoutTypeMeta(t *testing.T) {
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "a", Namespace: "b"}}

	var m map[string]any
	raw, err := json.Marshal(cm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, ok := m["apiVersion"]; ok {
		t.Fatal("precondition changed: typed objects now carry apiVersion")
	}
	if _, ok := m["kind"]; ok {
		t.Fatal("precondition changed: typed objects now carry kind")
	}
}

func TestApplySetsTypeMeta(t *testing.T) {
	scheme := testScheme(t)
	owner := &v1alpha1.MinecraftServer{
		ObjectMeta: metav1.ObjectMeta{Name: "smp", Namespace: "minikura", UID: "abc"},
	}

	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "a", Namespace: "minikura"}}
	if err := setOwner(owner, cm, scheme); err != nil {
		t.Fatalf("setOwner: %v", err)
	}

	gvk, err := apiutil.GVKForObject(cm, scheme)
	if err != nil {
		t.Fatalf("GVKForObject: %v", err)
	}
	cm.GetObjectKind().SetGroupVersionKind(gvk)

	raw, err := json.Marshal(cm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if m["apiVersion"] != "v1" {
		t.Errorf("apiVersion = %v, want v1", m["apiVersion"])
	}
	if m["kind"] != "ConfigMap" {
		t.Errorf("kind = %v, want ConfigMap", m["kind"])
	}

	refs := cm.GetOwnerReferences()
	if len(refs) != 1 {
		t.Fatalf("ownerReferences = %d, want 1", len(refs))
	}
	if refs[0].Kind != "MinecraftServer" || refs[0].Name != "smp" {
		t.Errorf("owner = %s/%s, want MinecraftServer/smp", refs[0].Kind, refs[0].Name)
	}
	if refs[0].Controller == nil || !*refs[0].Controller {
		t.Error("owner reference should be a controller reference")
	}
}

func TestApplyCreatesAndUpdates(t *testing.T) {
	owner := testMinecraft("smp", v1alpha1.ServerStateful)
	c := newFakeClient(t, owner)
	scheme := testScheme(t)

	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "minecraft-smp-config", Namespace: owner.Namespace},
		Data:       map[string]string{"server-type": "STATEFUL"},
	}
	if err := apply(context.Background(), c, owner, cm, scheme); err != nil {
		t.Fatalf("create apply: %v", err)
	}

	var got corev1.ConfigMap
	mustGet(t, c, client.ObjectKeyFromObject(cm), &got)
	if got.Data["server-type"] != "STATEFUL" {
		t.Errorf("data = %v", got.Data)
	}
	if len(got.OwnerReferences) != 1 {
		t.Fatalf("ownerReferences = %d, want 1", len(got.OwnerReferences))
	}

	updated := got.DeepCopy()
	updated.Data["server-type"] = "STATELESS"
	if err := apply(context.Background(), c, owner, updated, scheme); err != nil {
		t.Fatalf("update apply: %v", err)
	}
	mustGet(t, c, client.ObjectKeyFromObject(cm), &got)
	if got.Data["server-type"] != "STATELESS" {
		t.Errorf("updated data = %v", got.Data)
	}
}
