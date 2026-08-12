package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/apiutil"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

var applyOpts = []client.PatchOption{
	client.FieldOwner(v1alpha1.ManagerName),
	client.ForceOwnership,
}

func apply(ctx context.Context, c client.Client, owner client.Object, obj client.Object, scheme *runtime.Scheme) error {
	if svc, ok := obj.(*corev1.Service); ok {
		if err := preserveServiceAllocations(ctx, c, svc); err != nil {
			return err
		}
	}
	if err := setOwner(owner, obj, scheme); err != nil {
		return err
	}

	gvk, err := apiutil.GVKForObject(obj, scheme)
	if err != nil {
		return err
	}
	obj.GetObjectKind().SetGroupVersionKind(gvk)

	obj.SetManagedFields(nil)
	obj.SetResourceVersion("")
	return c.Patch(ctx, obj, client.Apply, applyOpts...)
}

func preserveServiceAllocations(ctx context.Context, c client.Client, desired *corev1.Service) error {
	var current corev1.Service
	if err := c.Get(ctx, client.ObjectKeyFromObject(desired), &current); err != nil {
		return client.IgnoreNotFound(err)
	}
	desired.Spec.ClusterIP = current.Spec.ClusterIP
	desired.Spec.ClusterIPs = append([]string(nil), current.Spec.ClusterIPs...)
	desired.Spec.IPFamilies = append([]corev1.IPFamily(nil), current.Spec.IPFamilies...)
	desired.Spec.IPFamilyPolicy = current.Spec.IPFamilyPolicy
	if desired.Spec.Type != corev1.ServiceTypeClusterIP {
		for i := range desired.Spec.Ports {
			if desired.Spec.Ports[i].NodePort != 0 {
				continue
			}
			for _, port := range current.Spec.Ports {
				if port.Name == desired.Spec.Ports[i].Name && port.Protocol == desired.Spec.Ports[i].Protocol {
					desired.Spec.Ports[i].NodePort = port.NodePort
					break
				}
			}
		}
	}
	return nil
}
