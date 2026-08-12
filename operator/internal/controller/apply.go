package controller

import (
	"context"

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
