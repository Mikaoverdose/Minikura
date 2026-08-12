package controller

import (
	"context"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
	"github.com/YuzuZensai/Minikura/operator/internal/resources"
)

type MinecraftServerReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=minecraftservers,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=minecraftservers/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=minikura.kirameki.cafe,resources=minecraftservers/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments;statefulsets,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services;configmaps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch
// +kubebuilder:rbac:groups=coordination.k8s.io,resources=leases,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=events,verbs=create;patch

func (r *MinecraftServerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	var mc v1alpha1.MinecraftServer
	if err := r.Get(ctx, req.NamespacedName, &mc); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if !mc.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if err := apply(ctx, r.Client, &mc, resources.MinecraftConfigMap(&mc), r.Scheme); err != nil {
		return r.fail(ctx, &mc, "ConfigMapFailed", err)
	}

	if err := apply(ctx, r.Client, &mc, resources.MinecraftService(&mc), r.Scheme); err != nil {
		return r.fail(ctx, &mc, "ServiceFailed", err)
	}

	stateful := mc.Spec.Type == v1alpha1.ServerStateful
	if err := r.reconcileWorkload(ctx, &mc, stateful); err != nil {
		return r.fail(ctx, &mc, "WorkloadFailed", err)
	}

	if err := r.pruneOppositeWorkload(ctx, &mc, stateful); err != nil {
		logger.Error(err, "failed to prune previous workload")
	}

	return ctrl.Result{}, r.updateStatus(ctx, &mc, stateful)
}

func (r *MinecraftServerReconciler) reconcileWorkload(ctx context.Context, mc *v1alpha1.MinecraftServer, stateful bool) error {
	if !stateful {
		return apply(ctx, r.Client, mc, resources.MinecraftDeployment(mc), r.Scheme)
	}

	sts, err := resources.MinecraftStatefulSet(mc)
	if err != nil {
		return err
	}
	return apply(ctx, r.Client, mc, sts, r.Scheme)
}

func (r *MinecraftServerReconciler) pruneOppositeWorkload(ctx context.Context, mc *v1alpha1.MinecraftServer, stateful bool) error {
	name := resources.ServerName(mc.Name)
	key := client.ObjectKey{Name: name, Namespace: mc.Namespace}

	var stale client.Object
	if stateful {
		stale = &appsv1.Deployment{}
	} else {
		stale = &appsv1.StatefulSet{}
	}

	if err := r.Get(ctx, key, stale); err != nil {
		return client.IgnoreNotFound(err)
	}
	if !metav1.IsControlledBy(stale, mc) {
		return nil
	}
	return client.IgnoreNotFound(r.Delete(ctx, stale))
}

func (r *MinecraftServerReconciler) updateStatus(ctx context.Context, mc *v1alpha1.MinecraftServer, stateful bool) error {
	name := resources.ServerName(mc.Name)
	key := client.ObjectKey{Name: name, Namespace: mc.Namespace}

	var ready, replicas int32
	if stateful {
		var sts appsv1.StatefulSet
		if err := r.Get(ctx, key, &sts); err == nil {
			ready, replicas = sts.Status.ReadyReplicas, sts.Status.Replicas
		} else if !apierrors.IsNotFound(err) {
			return err
		}
	} else {
		var dep appsv1.Deployment
		if err := r.Get(ctx, key, &dep); err == nil {
			ready, replicas = dep.Status.ReadyReplicas, dep.Status.Replicas
		} else if !apierrors.IsNotFound(err) {
			return err
		}
	}

	phase := phaseFromReady(ready)

	endpoint, err := r.endpoint(ctx, mc)
	if err != nil {
		return err
	}

	patch := client.MergeFrom(mc.DeepCopy())
	mc.Status.Phase = phase
	mc.Status.ReadyReplicas = ready
	mc.Status.Replicas = replicas
	mc.Status.Endpoint = endpoint
	mc.Status.ObservedGeneration = mc.Generation
	mc.Status.Message = ""
	setCondition(&mc.Status.Conditions, metav1.Condition{
		Type:               v1alpha1.ConditionReady,
		Status:             conditionStatus(ready > 0),
		Reason:             phase,
		ObservedGeneration: mc.Generation,
	})

	return r.Status().Patch(ctx, mc, patch)
}

func (r *MinecraftServerReconciler) endpoint(ctx context.Context, mc *v1alpha1.MinecraftServer) (string, error) {
	var svc corev1.Service
	key := client.ObjectKey{Name: resources.ServerName(mc.Name), Namespace: mc.Namespace}
	if err := r.Get(ctx, key, &svc); err != nil {
		if apierrors.IsNotFound(err) {
			return "", nil
		}
		return "", err
	}
	return serviceEndpoint(&svc, mc.Namespace), nil
}

func (r *MinecraftServerReconciler) fail(ctx context.Context, mc *v1alpha1.MinecraftServer, reason string, cause error) (ctrl.Result, error) {
	return failWithStatus(ctx, r.Client, mc, cause, func() {
		mc.Status.Phase = v1alpha1.PhaseFailed
		mc.Status.Message = cause.Error()
		setCondition(&mc.Status.Conditions, metav1.Condition{
			Type:               v1alpha1.ConditionReady,
			Status:             metav1.ConditionFalse,
			Reason:             reason,
			Message:            cause.Error(),
			ObservedGeneration: mc.Generation,
		})
	})
}

func (r *MinecraftServerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.MinecraftServer{}).
		Owns(&appsv1.Deployment{}).
		Owns(&appsv1.StatefulSet{}).
		Owns(&corev1.Service{}).
		Owns(&corev1.ConfigMap{}).
		Complete(r)
}
