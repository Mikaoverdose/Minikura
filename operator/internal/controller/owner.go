package controller

import (
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func setOwner(owner, obj client.Object, scheme *runtime.Scheme) error {
	return controllerutil.SetControllerReference(owner, obj, scheme)
}
