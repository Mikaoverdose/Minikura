package controller

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
	"github.com/YuzuZensai/Minikura/operator/internal/resources"
)

func TestProxyReconcileCreatesResources(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newFakeClient(t, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	name := resources.ProxyName(rp.Spec.Type, rp.Name)
	ns := rp.Namespace
	mustGet(t, c, client.ObjectKey{Name: resources.ConfigMapName(name), Namespace: ns}, &corev1.ConfigMap{})
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: ns}, &corev1.Service{})
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: ns}, &appsv1.Deployment{})

	var got v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &got)
	if got.Status.Phase != v1alpha1.PhasePending {
		t.Errorf("phase = %q, want Pending", got.Status.Phase)
	}
	if got.Status.Endpoint != "" {
		t.Errorf("endpoint = %q, want empty until LB is assigned", got.Status.Endpoint)
	}
}

func TestProxyReconcilePrunesStaleType(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newFakeClient(t, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("first reconcile: %v", err)
	}

	var current v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &current)
	current.Spec.Type = v1alpha1.ProxyBungeeCord
	current.Generation = 2
	if err := c.Update(context.Background(), &current); err != nil {
		t.Fatalf("update type: %v", err)
	}

	if _, err := r.Reconcile(context.Background(), requestFor(&current)); err != nil {
		t.Fatalf("second reconcile: %v", err)
	}

	oldName := resources.ProxyName(v1alpha1.ProxyVelocity, rp.Name)
	newName := resources.ProxyName(v1alpha1.ProxyBungeeCord, rp.Name)
	mustGet(t, c, client.ObjectKey{Name: newName, Namespace: rp.Namespace}, &appsv1.Deployment{})

	var stale appsv1.Deployment
	if err := c.Get(context.Background(), client.ObjectKey{Name: oldName, Namespace: rp.Namespace}, &stale); !apierrors.IsNotFound(err) {
		t.Fatalf("expected stale velocity deployment pruned, got %v", err)
	}
}

func TestProxyBackendsRespectsSelector(t *testing.T) {
	lobby := testMinecraft("lobby", v1alpha1.ServerStateless)
	lobby.Labels = map[string]string{"tier": "lobby"}
	smp := testMinecraft("smp", v1alpha1.ServerStateful)
	smp.Labels = map[string]string{"tier": "survival"}
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	rp.Spec.BackendSelector = &metav1.LabelSelector{
		MatchLabels: map[string]string{"tier": "lobby"},
	}

	c := newFakeClient(t, lobby, smp, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}

	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	var got v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &got)
	if !reflect.DeepEqual(got.Status.Backends, []string{"lobby"}) {
		t.Errorf("backends = %v, want [lobby]", got.Status.Backends)
	}
}

func TestProxyBackendsListsAllWhenUnfiltered(t *testing.T) {
	c := newFakeClient(t,
		testMinecraft("b", v1alpha1.ServerStateless),
		testMinecraft("a", v1alpha1.ServerStateful),
		testProxy("edge", v1alpha1.ProxyVelocity),
	)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}

	names, err := r.backends(context.Background(), testProxy("edge", v1alpha1.ProxyVelocity))
	if err != nil {
		t.Fatalf("backends: %v", err)
	}
	if !reflect.DeepEqual(names, []string{"a", "b"}) {
		t.Errorf("backends = %v, want [a b]", names)
	}
}

func TestMatchesBackend(t *testing.T) {
	obj := testMinecraft("lobby", v1alpha1.ServerStateless)
	obj.Labels = map[string]string{"tier": "lobby"}

	t.Run("nil selector matches all", func(t *testing.T) {
		if !matchesBackend(*testProxy("edge", v1alpha1.ProxyVelocity), obj) {
			t.Error("expected match")
		}
	})

	t.Run("matching labels", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		rp.Spec.BackendSelector = &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "lobby"}}
		if !matchesBackend(*rp, obj) {
			t.Error("expected match")
		}
	})

	t.Run("non matching labels", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		rp.Spec.BackendSelector = &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "survival"}}
		if matchesBackend(*rp, obj) {
			t.Error("expected no match")
		}
	})
}

func TestProxiesForServer(t *testing.T) {
	all := testProxy("all", v1alpha1.ProxyVelocity)
	filtered := testProxy("filtered", v1alpha1.ProxyVelocity)
	filtered.Spec.BackendSelector = &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "lobby"}}
	other := testProxy("other", v1alpha1.ProxyVelocity)
	other.Spec.BackendSelector = &metav1.LabelSelector{MatchLabels: map[string]string{"tier": "survival"}}

	mc := testMinecraft("lobby", v1alpha1.ServerStateless)
	mc.Labels = map[string]string{"tier": "lobby"}

	c := newFakeClient(t, all, filtered, other)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	reqs := r.proxiesForServer(context.Background(), mc)

	got := map[string]bool{}
	for _, req := range reqs {
		got[req.Name] = true
	}
	if !got["all"] || !got["filtered"] {
		t.Errorf("requests = %v, want all and filtered", got)
	}
	if got["other"] {
		t.Error("did not expect the survival-only proxy")
	}
}

func TestProxyBackendsInvalidSelector(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	rp.Spec.BackendSelector = &metav1.LabelSelector{
		MatchExpressions: []metav1.LabelSelectorRequirement{{
			Key:      "tier",
			Operator: "NotARealOperator",
			Values:   []string{"lobby"},
		}},
	}
	r := &ReverseProxyServerReconciler{Client: newFakeClient(t), Scheme: testScheme(t)}
	if _, err := r.backends(context.Background(), rp); err == nil {
		t.Fatal("expected invalid backendSelector to fail")
	}
}

func TestProxyReconcileIgnoresNotFound(t *testing.T) {
	r := &ReverseProxyServerReconciler{Client: newFakeClient(t), Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), reconcile.Request{
		NamespacedName: types.NamespacedName{Name: "missing", Namespace: "minikura"},
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestProxyReconcileSkipsDeleting(t *testing.T) {
	now := metav1.Now()
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	rp.DeletionTimestamp = &now
	rp.Finalizers = []string{"test.finalizer"}
	c := newFakeClient(t, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	var cm corev1.ConfigMap
	err := c.Get(context.Background(), client.ObjectKey{
		Name:      resources.ConfigMapName(resources.ProxyName(rp.Spec.Type, rp.Name)),
		Namespace: rp.Namespace,
	}, &cm)
	if !apierrors.IsNotFound(err) {
		t.Fatalf("expected no resources for deleting object, got %v", err)
	}
}

func TestProxyReconcileApplyFailure(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newInterceptedClient(t, interceptor.Funcs{
		Patch: func(ctx context.Context, c client.WithWatch, obj client.Object, patch client.Patch, opts ...client.PatchOption) error {
			if _, ok := obj.(*corev1.ConfigMap); ok {
				return errors.New("configmap apply failed")
			}
			return c.Patch(ctx, obj, patch, opts...)
		},
	}, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err == nil {
		t.Fatal("expected apply failure")
	}
	var got v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &got)
	if got.Status.Phase != v1alpha1.PhaseFailed {
		t.Errorf("phase = %q, want Failed", got.Status.Phase)
	}
	if !strings.Contains(got.Status.Message, "configmap apply failed") {
		t.Errorf("message = %q", got.Status.Message)
	}
}

func TestProxyReconcileServiceAndDeploymentFailures(t *testing.T) {
	t.Run("service", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		c := newInterceptedClient(t, interceptor.Funcs{
			Patch: func(ctx context.Context, c client.WithWatch, obj client.Object, patch client.Patch, opts ...client.PatchOption) error {
				if _, ok := obj.(*corev1.Service); ok {
					return errors.New("service apply failed")
				}
				return c.Patch(ctx, obj, patch, opts...)
			},
		}, rp)
		r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
		if _, err := r.Reconcile(context.Background(), requestFor(rp)); err == nil {
			t.Fatal("expected service failure")
		}
	})
	t.Run("deployment", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		c := newInterceptedClient(t, interceptor.Funcs{
			Patch: func(ctx context.Context, c client.WithWatch, obj client.Object, patch client.Patch, opts ...client.PatchOption) error {
				if _, ok := obj.(*appsv1.Deployment); ok {
					return errors.New("deployment apply failed")
				}
				return c.Patch(ctx, obj, patch, opts...)
			},
		}, rp)
		r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
		if _, err := r.Reconcile(context.Background(), requestFor(rp)); err == nil {
			t.Fatal("expected deployment failure")
		}
	})
}

func TestProxyPruneSkipsUnowned(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	stale := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      resources.ProxyName(v1alpha1.ProxyBungeeCord, rp.Name),
			Namespace: rp.Namespace,
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "x"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "x"}},
				Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "c", Image: "busybox"}}},
			},
		},
	}
	c := newFakeClient(t, rp, stale)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if err := r.pruneStaleResources(context.Background(), rp); err != nil {
		t.Fatalf("prune: %v", err)
	}
	mustGet(t, c, client.ObjectKeyFromObject(stale), &appsv1.Deployment{})
}

func TestProxyPruneGetError(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newInterceptedClient(t, interceptor.Funcs{
		Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
			if key.Name == resources.ProxyName(v1alpha1.ProxyBungeeCord, rp.Name) {
				return errors.New("get failed")
			}
			return c.Get(ctx, key, obj, opts...)
		},
	}, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if err := r.pruneStaleResources(context.Background(), rp); err == nil {
		t.Fatal("expected prune get error")
	}
}

func TestProxyReconcilePruneFailure(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newFakeClient(t, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("seed: %v", err)
	}

	var current v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &current)
	current.Spec.Type = v1alpha1.ProxyBungeeCord
	if err := c.Update(context.Background(), &current); err != nil {
		t.Fatalf("update type: %v", err)
	}

	watch, ok := c.(client.WithWatch)
	if !ok {
		t.Fatal("fake client does not implement WithWatch")
	}
	r.Client = interceptor.NewClient(watch, interceptor.Funcs{
		Delete: func(ctx context.Context, inner client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
			return errors.New("delete failed")
		},
	})
	if _, err := r.Reconcile(context.Background(), requestFor(&current)); err == nil {
		t.Fatal("expected prune failure")
	}
}

func TestProxyPruneDeleteError(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newFakeClient(t, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("seed: %v", err)
	}

	var current v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &current)
	current.Spec.Type = v1alpha1.ProxyBungeeCord

	watch, ok := c.(client.WithWatch)
	if !ok {
		t.Fatal("fake client does not implement WithWatch")
	}
	r.Client = interceptor.NewClient(watch, interceptor.Funcs{
		Delete: func(ctx context.Context, inner client.WithWatch, obj client.Object, opts ...client.DeleteOption) error {
			return errors.New("delete failed")
		},
	})
	if err := r.pruneStaleResources(context.Background(), &current); err == nil {
		t.Fatal("expected prune delete error")
	}
}

func TestProxyUpdateStatusErrors(t *testing.T) {
	t.Run("deployment get", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		c := newInterceptedClient(t, interceptor.Funcs{
			Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
				if _, ok := obj.(*appsv1.Deployment); ok {
					return errors.New("deployment get failed")
				}
				return c.Get(ctx, key, obj, opts...)
			},
		}, rp)
		r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
		if err := r.updateStatus(context.Background(), rp); err == nil {
			t.Fatal("expected deployment get error")
		}
	})
	t.Run("service get", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		c := newInterceptedClient(t, interceptor.Funcs{
			Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
				if _, ok := obj.(*corev1.Service); ok {
					return errors.New("service get failed")
				}
				return c.Get(ctx, key, obj, opts...)
			},
		}, rp)
		r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
		if err := r.updateStatus(context.Background(), rp); err == nil {
			t.Fatal("expected service get error")
		}
	})
	t.Run("invalid selector", func(t *testing.T) {
		rp := testProxy("edge", v1alpha1.ProxyVelocity)
		rp.Spec.BackendSelector = &metav1.LabelSelector{
			MatchExpressions: []metav1.LabelSelectorRequirement{{
				Key: "tier", Operator: "NotARealOperator", Values: []string{"x"},
			}},
		}
		r := &ReverseProxyServerReconciler{Client: newFakeClient(t, rp), Scheme: testScheme(t)}
		if err := r.updateStatus(context.Background(), rp); err == nil {
			t.Fatal("expected backend selector error")
		}
	})
}

func TestProxyStatusReadyAndEndpoint(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	c := newFakeClient(t, rp)
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	name := resources.ProxyName(rp.Spec.Type, rp.Name)
	var dep appsv1.Deployment
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: rp.Namespace}, &dep)
	dep.Status.Replicas = 1
	dep.Status.ReadyReplicas = 1
	if err := c.Status().Update(context.Background(), &dep); err != nil {
		t.Fatalf("dep status: %v", err)
	}

	var svc corev1.Service
	mustGet(t, c, client.ObjectKey{Name: name, Namespace: rp.Namespace}, &svc)
	svc.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{{IP: "9.9.9.9"}}
	if err := c.Status().Update(context.Background(), &svc); err != nil {
		t.Fatalf("svc status: %v", err)
	}

	if _, err := r.Reconcile(context.Background(), requestFor(rp)); err != nil {
		t.Fatalf("second reconcile: %v", err)
	}
	var got v1alpha1.ReverseProxyServer
	mustGet(t, c, client.ObjectKeyFromObject(rp), &got)
	if got.Status.Phase != v1alpha1.PhaseRunning {
		t.Errorf("phase = %q", got.Status.Phase)
	}
	if got.Status.Endpoint != "9.9.9.9:25565" {
		t.Errorf("endpoint = %q", got.Status.Endpoint)
	}
}

func TestProxiesForServerListError(t *testing.T) {
	c := newInterceptedClient(t, interceptor.Funcs{
		List: func(ctx context.Context, c client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
			return errors.New("list failed")
		},
	})
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if reqs := r.proxiesForServer(context.Background(), testMinecraft("lobby", v1alpha1.ServerStateless)); reqs != nil {
		t.Errorf("requests = %v, want nil", reqs)
	}
}

func TestMatchesBackendInvalidSelector(t *testing.T) {
	rp := testProxy("edge", v1alpha1.ProxyVelocity)
	rp.Spec.BackendSelector = &metav1.LabelSelector{
		MatchExpressions: []metav1.LabelSelectorRequirement{{
			Key: "tier", Operator: "NotARealOperator", Values: []string{"x"},
		}},
	}
	if matchesBackend(*rp, testMinecraft("lobby", v1alpha1.ServerStateless)) {
		t.Error("invalid selector should not match")
	}
}

func TestProxyBackendsListError(t *testing.T) {
	c := newInterceptedClient(t, interceptor.Funcs{
		List: func(ctx context.Context, c client.WithWatch, list client.ObjectList, opts ...client.ListOption) error {
			return errors.New("list failed")
		},
	})
	r := &ReverseProxyServerReconciler{Client: c, Scheme: testScheme(t)}
	if _, err := r.backends(context.Background(), testProxy("edge", v1alpha1.ProxyVelocity)); err == nil {
		t.Fatal("expected list error")
	}
}
