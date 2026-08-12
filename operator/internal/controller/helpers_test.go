package controller

import (
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1alpha1 "github.com/YuzuZensai/Minikura/operator/api/v1alpha1"
)

func testScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	s := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(s); err != nil {
		t.Fatalf("add client-go scheme: %v", err)
	}
	if err := v1alpha1.AddToScheme(s); err != nil {
		t.Fatalf("add v1alpha1 scheme: %v", err)
	}
	return s
}

func newFakeClient(t *testing.T, objs ...client.Object) client.Client {
	t.Helper()
	return newInterceptedClient(t, interceptor.Funcs{}, objs...)
}

func newInterceptedClient(t *testing.T, funcs interceptor.Funcs, objs ...client.Object) client.Client {
	t.Helper()
	return fake.NewClientBuilder().
		WithScheme(testScheme(t)).
		WithStatusSubresource(
			&v1alpha1.MinecraftServer{},
			&v1alpha1.ReverseProxyServer{},
			&appsv1.Deployment{},
			&appsv1.StatefulSet{},
			&corev1.Service{},
		).
		WithObjects(objs...).
		WithInterceptorFuncs(funcs).
		Build()
}

func requestFor(obj client.Object) reconcile.Request {
	return reconcile.Request{NamespacedName: types.NamespacedName{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}}
}

func testMinecraft(name string, kind v1alpha1.ServerKind) *v1alpha1.MinecraftServer {
	return &v1alpha1.MinecraftServer{
		TypeMeta: metav1.TypeMeta{
			APIVersion: v1alpha1.GroupVersion.String(),
			Kind:       "MinecraftServer",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:       name,
			Namespace:  "minikura",
			UID:        types.UID("uid-" + name),
			Generation: 1,
		},
		Spec: v1alpha1.MinecraftServerSpec{
			Type:             kind,
			ListenPort:       25565,
			ServiceType:      v1alpha1.ExposureClusterIP,
			JarType:          "PAPER",
			MinecraftVersion: "1.20.4",
			StorageSize:      "10Gi",
		},
	}
}

func testProxy(name string, kind v1alpha1.ProxyKind) *v1alpha1.ReverseProxyServer {
	return &v1alpha1.ReverseProxyServer{
		TypeMeta: metav1.TypeMeta{
			APIVersion: v1alpha1.GroupVersion.String(),
			Kind:       "ReverseProxyServer",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:       name,
			Namespace:  "minikura",
			UID:        types.UID("uid-" + name),
			Generation: 1,
		},
		Spec: v1alpha1.ReverseProxyServerSpec{
			Type:            kind,
			ExternalAddress: "play.example.com",
			ExternalPort:    25565,
			ListenPort:      25577,
			ServiceType:     v1alpha1.ExposureLoadBalancer,
		},
	}
}
