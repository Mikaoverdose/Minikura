package controller

import (
	"context"
	"errors"
	"strings"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
	"github.com/YuzuZensai/Minikura/operator/internal/resources"
)

func TestMinecraftReconcileStatelessCreatesResources(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	name := resources.ServerName(mc.Name)
	ns := mc.Namespace
	mustGet(t, c, client.ObjectKey{Name: resources.ConfigMapName(name), Namespace: ns}, &corev1.ConfigMap{})
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: ns}, &corev1.Service{})
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: ns}, &appsv1.Deployment{})

	var sts appsv1.StatefulSet
	if err := c.Get(context.Background(), client.ObjectKey{Name: name, Namespace: ns}, &sts); !apierrors.IsNotFound(err) {
		t.Fatalf("expected no statefulset, got %v", err)
	}

	var got v1alpha1.MinecraftServer
	mustGet(t, c, client.ObjectKeyFromObject(mc), &got)
	if got.Status.Phase != v1alpha1.PhasePending {
		t.Errorf("phase = %q, want Pending", got.Status.Phase)
	}
	if got.Status.ObservedGeneration != 1 {
		t.Errorf("observedGeneration = %d, want 1", got.Status.ObservedGeneration)
	}
	if got.Status.Endpoint != "minecraft-lobby.minikura.svc.cluster.local:25565" {
		t.Errorf("endpoint = %q", got.Status.Endpoint)
	}
}

func TestMinecraftReconcileStatefulCreatesStatefulSet(t *testing.T) {
	mc := testMinecraft("smp", v1alpha1.ServerStateful)
	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	name := resources.ServerName(mc.Name)
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: mc.Namespace}, &appsv1.StatefulSet{})

	var dep appsv1.Deployment
	if err := c.Get(context.Background(), client.ObjectKey{Name: name, Namespace: mc.Namespace}, &dep); !apierrors.IsNotFound(err) {
		t.Fatalf("expected no deployment, got %v", err)
	}
}

func TestMinecraftReconcilePrunesOppositeWorkload(t *testing.T) {
	mc := testMinecraft("swap", v1alpha1.ServerStateless)
	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("first reconcile: %v", err)
	}

	var current v1alpha1.MinecraftServer
	mustGet(t, c, client.ObjectKeyFromObject(mc), &current)
	current.Spec.Type = v1alpha1.ServerStateful
	current.Generation = 2
	if err := c.Update(context.Background(), &current); err != nil {
		t.Fatalf("update type: %v", err)
	}

	if _, err := r.Reconcile(context.Background(), requestFor(&current)); err != nil {
		t.Fatalf("second reconcile: %v", err)
	}

	name := resources.ServerName(mc.Name)
	key := client.ObjectKey{Name: name, Namespace: mc.Namespace}
	mustGet(t, c, key, &appsv1.StatefulSet{})

	var dep appsv1.Deployment
	if err := c.Get(context.Background(), key, &dep); !apierrors.IsNotFound(err) {
		t.Fatalf("expected deployment pruned, got %v", err)
	}
}

func TestMinecraftReconcileIgnoresNotFound(t *testing.T) {
	r := &MinecraftServerReconciler{Client: newFakeClient(t), Scheme: testScheme(t)}
	res, err := r.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: types.NamespacedName{Name: "missing", Namespace: "minikura"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res != (ctrl.Result{}) {
		t.Errorf("result = %#v, want empty", res)
	}
}

func TestMinecraftReconcileSkipsDeleting(t *testing.T) {
	now := metav1.Now()
	mc := testMinecraft("gone", v1alpha1.ServerStateless)
	mc.DeletionTimestamp = &now
	mc.Finalizers = []string{"test.finalizer"}

	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	var cm corev1.ConfigMap
	err := c.Get(context.Background(), client.ObjectKey{
		Name:      resources.ConfigMapName(resources.ServerName(mc.Name)),
		Namespace: mc.Namespace,
	}, &cm)
	if !apierrors.IsNotFound(err) {
		t.Fatalf("expected no resources for deleting object, got %v", err)
	}
}

func TestMinecraftReconcileInvalidStorageFails(t *testing.T) {
	mc := testMinecraft("bad", v1alpha1.ServerStateful)
	mc.Spec.StorageSize = "not-a-size"
	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err == nil {
		t.Fatal("expected error for invalid storageSize")
	}

	var got v1alpha1.MinecraftServer
	mustGet(t, c, client.ObjectKeyFromObject(mc), &got)
	if got.Status.Phase != v1alpha1.PhaseFailed {
		t.Errorf("phase = %q, want Failed", got.Status.Phase)
	}
	if got.Status.Message == "" {
		t.Error("expected a failure message")
	}
}

func TestMinecraftPruneSkipsUnownedWorkload(t *testing.T) {
	mc := testMinecraft("swap", v1alpha1.ServerStateful)
	stale := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      resources.ServerName(mc.Name),
			Namespace: mc.Namespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "x"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "x"}},
				Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "c", Image: "busybox"}}},
			},
		},
	}
	c := newFakeClient(t, mc, stale)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if err := r.pruneOppositeWorkload(context.Background(), mc, true); err != nil {
		t.Fatalf("prune: %v", err)
	}
	mustGet(t, c, client.ObjectKeyFromObject(stale), &appsv1.Deployment{})
}

func TestMinecraftStatusUsesReadyReplicas(t *testing.T) {
	mc := testMinecraft("ready", v1alpha1.ServerStateless)
	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	var dep appsv1.Deployment
	mustGet(t, c, client.ObjectKey{Name: resources.ServerName(mc.Name), Namespace: mc.Namespace}, &dep)
	dep.Status.Replicas = 1
	dep.Status.ReadyReplicas = 1
	if err := c.Status().Update(context.Background(), &dep); err != nil {
		t.Fatalf("update deployment status: %v", err)
	}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("second reconcile: %v", err)
	}

	var got v1alpha1.MinecraftServer
	mustGet(t, c, client.ObjectKeyFromObject(mc), &got)
	if got.Status.Phase != v1alpha1.PhaseRunning {
		t.Errorf("phase = %q, want Running", got.Status.Phase)
	}
	if got.Status.ReadyReplicas != 1 {
		t.Errorf("readyReplicas = %d, want 1", got.Status.ReadyReplicas)
	}
}

func TestMinecraftReconcileApplyFailure(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		Patch: func(ctx context.Context, c client.WithWatch, obj client.Object, patch client.Patch, opts ...client.PatchOption) error {
			if _, ok := obj.(*corev1.ConfigMap); ok {
				return errors.New("configmap apply failed")
			}
			return c.Patch(ctx, obj, patch, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err == nil {
		t.Fatal("expected apply failure")
	}

	var got v1alpha1.MinecraftServer
	mustGet(t, c, client.ObjectKeyFromObject(mc), &got)
	if got.Status.Phase != v1alpha1.PhaseFailed {
		t.Errorf("phase = %q, want Failed", got.Status.Phase)
	}
	if !strings.Contains(got.Status.Message, "configmap apply failed") {
		t.Errorf("message = %q", got.Status.Message)
	}
}

func TestMinecraftReconcileServiceFailure(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		Patch: func(ctx context.Context, c client.WithWatch, obj client.Object, patch client.Patch, opts ...client.PatchOption) error {
			if _, ok := obj.(*corev1.Service); ok {
				return errors.New("service apply failed")
			}
			return c.Patch(ctx, obj, patch, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err == nil {
		t.Fatal("expected service apply failure")
	}
}

func TestMinecraftReconcileContinuesAfterPruneError(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if _, ok := obj.(*appsv1.StatefulSet); ok {
				return errors.New("sts lookup failed")
			}
			return c.Get(ctx, key, obj, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("prune errors should not fail reconcile: %v", err)
	}
}

func TestMinecraftUpdateStatusWorkloadGetError(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if _, ok := obj.(*appsv1.Deployment); ok {
				return errors.New("deployment get failed")
			}
			return c.Get(ctx, key, obj, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if err := r.updateStatus(context.Background(), mc, false); err == nil {
		t.Fatal("expected workload get error")
	}
}

func TestMinecraftUpdateStatusStatefulGetError(t *testing.T) {
	mc := testMinecraft("smp", v1alpha1.ServerStateful)
	c := newInterceptedClient(t, interceptor.Funcs{
		Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if _, ok := obj.(*appsv1.StatefulSet); ok {
				return errors.New("sts get failed")
			}
			return c.Get(ctx, key, obj, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if err := r.updateStatus(context.Background(), mc, true); err == nil {
		t.Fatal("expected statefulset get error")
	}
}

func TestMinecraftUpdateStatusEndpointError(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if _, ok := obj.(*corev1.Service); ok {
				return errors.New("service get failed")
			}
			return c.Get(ctx, key, obj, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if err := r.updateStatus(context.Background(), mc, false); err == nil {
		t.Fatal("expected endpoint get error")
	}
}

func TestMinecraftEndpointGetError(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	c := newInterceptedClient(t, interceptor.Funcs{
		Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if _, ok := obj.(*corev1.Service); ok {
				return errors.New("service get failed")
			}
			return c.Get(ctx, key, obj, opts...)
		},
	}, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.endpoint(context.Background(), mc); err == nil {
		t.Fatal("expected service get error")
	}
}

func TestMinecraftEndpointMissingService(t *testing.T) {
	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	r := &MinecraftServerReconciler{Client: newFakeClient(t, mc), Scheme: testScheme(t)}
	got, err := r.endpoint(context.Background(), mc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "" {
		t.Errorf("endpoint = %q, want empty", got)
	}
}

func TestMinecraftStatusUsesStatefulReadyReplicas(t *testing.T) {
	mc := testMinecraft("smp", v1alpha1.ServerStateful)
	c := newFakeClient(t, mc)
	r := &MinecraftServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	var sts appsv1.StatefulSet
	mustGet(t, c, client.ObjectKey{Name: resources.ServerName(mc.Name), Namespace: mc.Namespace}, &sts)
	sts.Status.Replicas = 1
	sts.Status.ReadyReplicas = 1
	if err := c.Status().Update(context.Background(), &sts); err != nil {
		t.Fatalf("update sts status: %v", err)
	}
	if _, err := r.Reconcile(context.Background(), requestFor(mc)); err != nil {
		t.Fatalf("second reconcile: %v", err)
	}

	var got v1alpha1.MinecraftServer
	mustGet(t, c, client.ObjectKeyFromObject(mc), &got)
	if got.Status.Phase != v1alpha1.PhaseRunning || got.Status.ReadyReplicas != 1 {
		t.Errorf("status = %+v", got.Status)
	}
}

func TestApplyRejectsCrossNamespaceOwner(t *testing.T) {
	owner := testMinecraft("smp", v1alpha1.ServerStateful)
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "x", Namespace: "other"}}
	if err := apply(context.Background(), newFakeClient(t), owner, cm, testScheme(t)); err == nil {
		t.Fatal("expected setOwner to fail across namespaces")
	}
}

func TestApplyRejectsUnknownType(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := v1alpha1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	owner := testMinecraft("smp", v1alpha1.ServerStateful)
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "x", Namespace: owner.Namespace}}
	if err := apply(context.Background(), newFakeClient(t, owner), owner, cm, scheme); err == nil {
		t.Fatal("expected GVK lookup to fail")
	}
}

func mustGet(t *testing.T, c client.Client, key client.ObjectKey, obj client.Object) {
	t.Helper()
	if err := c.Get(context.Background(), key, obj); err != nil {
		t.Fatalf("get %T %s: %v", obj, key, err)
	}
}
