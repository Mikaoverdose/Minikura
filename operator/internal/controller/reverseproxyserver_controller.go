package controller

import (
	"context"
	"fmt"
	"sort"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
	"github.com/YuzuZensai/Minikura/operator/internal/resources"
)

type ReverseProxyServerReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=reverseproxyservers,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=reverseproxyservers/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=reverseproxyservers/finalizers,verbs=update
// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=minecraftservers,verbs=get;list;watch
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services;configmaps,verbs=get;list;watch;create;update;patch;delete

func (r *ReverseProxyServerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	var rp v1alpha1.ReverseProxyServer
	if err := r.Get(ctx, req.NamespacedName, &rp); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if !rp.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}
	if rp.Spec.Type != v1alpha1.ProxyVelocity && rp.Spec.Type != v1alpha1.ProxyBungeeCord {
		return r.fail(ctx, &rp, "InvalidSpec", fmt.Errorf("unsupported proxy type %q", rp.Spec.Type))
	}
	if rp.Spec.ExternalPort <= 0 || rp.Spec.ListenPort <= 0 {
		return r.fail(ctx, &rp, "InvalidSpec", fmt.Errorf("externalPort and listenPort must be set"))
	}

	if err := apply(ctx, r.Client, &rp, resources.ProxyConfigMap(&rp), r.Scheme); err != nil {
		return r.fail(ctx, &rp, "ConfigMapFailed", err)
	}

	if err := apply(ctx, r.Client, &rp, resources.ProxyService(&rp), r.Scheme); err != nil {
		return r.fail(ctx, &rp, "ServiceFailed", err)
	}

	if err := apply(ctx, r.Client, &rp, resources.ProxyDeployment(&rp), r.Scheme); err != nil {
		return r.fail(ctx, &rp, "DeploymentFailed", err)
	}
	if err := r.pruneStaleResources(ctx, &rp); err != nil {
		return r.fail(ctx, &rp, "PruneFailed", err)
	}

	if err := r.updateStatus(ctx, &rp); err != nil {
		return r.fail(ctx, &rp, "StatusFailed", err)
	}
	return ctrl.Result{}, nil
}

func (r *ReverseProxyServerReconciler) pruneStaleResources(ctx context.Context, rp *v1alpha1.ReverseProxyServer) error {
	current := resources.ProxyName(rp.Spec.Type, rp.Name)
	for _, kind := range []v1alpha1.ProxyKind{v1alpha1.ProxyVelocity, v1alpha1.ProxyBungeeCord} {
		name := resources.ProxyName(kind, rp.Name)
		if name == current {
			continue
		}
		for _, obj := range []client.Object{&appsv1.Deployment{}, &corev1.Service{}, &corev1.ConfigMap{}} {
			key := client.ObjectKey{Name: name, Namespace: rp.Namespace}
			if err := r.Get(ctx, key, obj); err != nil {
				if apierrors.IsNotFound(err) {
					continue
				}
				return err
			}
			if metav1.IsControlledBy(obj, rp) {
				if err := r.Delete(ctx, obj); err != nil && !apierrors.IsNotFound(err) {
					return err
				}
			}
		}
	}
	return nil
}

func (r *ReverseProxyServerReconciler) backends(ctx context.Context, rp *v1alpha1.ReverseProxyServer) ([]string, error) {
	selector := labels.Everything()
	if rp.Spec.BackendSelector != nil {
		s, err := metav1.LabelSelectorAsSelector(rp.Spec.BackendSelector)
		if err != nil {
			return nil, fmt.Errorf("invalid backendSelector: %w", err)
		}
		selector = s
	}

	var list v1alpha1.MinecraftServerList
	if err := r.List(ctx, &list,
		client.InNamespace(rp.Namespace),
		client.MatchingLabelsSelector{Selector: selector},
	); err != nil {
		return nil, err
	}

	names := make([]string, 0, len(list.Items))
	for _, mc := range list.Items {
		names = append(names, mc.Name)
	}
	sort.Strings(names)
	return names, nil
}

func (r *ReverseProxyServerReconciler) updateStatus(ctx context.Context, rp *v1alpha1.ReverseProxyServer) error {
	name := resources.ProxyName(rp.Spec.Type, rp.Name)
	key := client.ObjectKey{Name: name, Namespace: rp.Namespace}

	var ready, replicas int32
	var dep appsv1.Deployment
	if err := r.Get(ctx, key, &dep); err == nil {
		ready, replicas = dep.Status.ReadyReplicas, dep.Status.Replicas
	} else if !apierrors.IsNotFound(err) {
		return err
	}

	backends, err := r.backends(ctx, rp)
	if err != nil {
		return err
	}

	endpoint := ""
	var svc corev1.Service
	if err := r.Get(ctx, key, &svc); err == nil {
		endpoint = serviceEndpoint(&svc, rp.Namespace)
	} else if !apierrors.IsNotFound(err) {
		return err
	}

	phase := phaseFromReady(ready)

	patch := client.MergeFrom(rp.DeepCopy())
	rp.Status.Phase = phase
	rp.Status.ReadyReplicas = ready
	rp.Status.Replicas = replicas
	rp.Status.Endpoint = endpoint
	rp.Status.Backends = backends
	rp.Status.ObservedGeneration = rp.Generation
	rp.Status.Message = ""
	setCondition(&rp.Status.Conditions, metav1.Condition{
		Type:               v1alpha1.ConditionReady,
		Status:             conditionStatus(ready > 0),
		Reason:             phase,
		ObservedGeneration: rp.Generation,
	})

	return r.Status().Patch(ctx, rp, patch)
}

func (r *ReverseProxyServerReconciler) fail(ctx context.Context, rp *v1alpha1.ReverseProxyServer, reason string, cause error) (ctrl.Result, error) {
	return failWithStatus(ctx, r.Client, rp, cause, func() {
		rp.Status.Phase = v1alpha1.PhaseFailed
		rp.Status.Message = cause.Error()
		rp.Status.ObservedGeneration = rp.Generation
		setCondition(&rp.Status.Conditions, metav1.Condition{
			Type:               v1alpha1.ConditionReady,
			Status:             metav1.ConditionFalse,
			Reason:             reason,
			Message:            cause.Error(),
			ObservedGeneration: rp.Generation,
		})
	})
}

func (r *ReverseProxyServerReconciler) proxiesForServer(ctx context.Context, obj client.Object) []reconcile.Request {
	var list v1alpha1.ReverseProxyServerList
	if err := r.List(ctx, &list, client.InNamespace(obj.GetNamespace())); err != nil {
		return nil
	}

	reqs := make([]reconcile.Request, 0, len(list.Items))
	for _, rp := range list.Items {
		if !matchesBackend(rp, obj) {
			continue
		}
		reqs = append(reqs, reconcile.Request{
			NamespacedName: client.ObjectKey{Name: rp.Name, Namespace: rp.Namespace},
		})
	}
	return reqs
}

func matchesBackend(rp v1alpha1.ReverseProxyServer, obj client.Object) bool {
	if rp.Spec.BackendSelector == nil {
		return true
	}
	selector, err := metav1.LabelSelectorAsSelector(rp.Spec.BackendSelector)
	if err != nil {
		return false
	}
	return selector.Matches(labels.Set(obj.GetLabels()))
}

func (r *ReverseProxyServerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ReverseProxyServer{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&corev1.ConfigMap{}).
		Watches(&v1alpha1.MinecraftServer{}, handler.EnqueueRequestsFromMapFunc(r.proxiesForServer)).
		Complete(r)
}
