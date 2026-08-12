package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +kubebuilder:validation:Enum=VELOCITY;BUNGEECORD
type ProxyKind string

const (
	ProxyVelocity   ProxyKind = "VELOCITY"
	ProxyBungeeCord ProxyKind = "BUNGEECORD"
)

type ReverseProxyServerSpec struct {
	Type ProxyKind `json:"type"`

	// +optional
	Description string `json:"description,omitempty"`

	ExternalAddress string `json:"externalAddress"`

	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=65535
	ExternalPort int32 `json:"externalPort"`

	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=65535
	// +kubebuilder:default=25565
	ListenPort int32 `json:"listenPort,omitempty"`

	// +kubebuilder:default=LoadBalancer
	ServiceType ServiceExposure `json:"serviceType,omitempty"`

	// +optional
	// +kubebuilder:validation:Minimum=30000
	// +kubebuilder:validation:Maximum=32767
	NodePort int32 `json:"nodePort,omitempty"`

	// +optional
	Resources Resources `json:"resources,omitempty"`

	// +optional
	JVM JVMOptions `json:"jvm,omitempty"`

	// +optional
	Env []EnvVar `json:"env,omitempty"`

	// +optional
	APIKeySecretRef string `json:"apiKeySecretRef,omitempty"`

	// +optional
	BackendSelector *metav1.LabelSelector `json:"backendSelector,omitempty"`
}

type ReverseProxyServerStatus struct {
	// +optional
	Phase string `json:"phase,omitempty"`

	// +optional
	Message string `json:"message,omitempty"`

	// +optional
	ReadyReplicas int32 `json:"readyReplicas,omitempty"`

	// +optional
	Replicas int32 `json:"replicas,omitempty"`

	// +optional
	Endpoint string `json:"endpoint,omitempty"`

	// +optional
	Backends []string `json:"backends,omitempty"`

	// +optional
	ObservedGeneration int64 `json:"observedGeneration,omitempty"`

	// +optional
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:shortName=rps
// +kubebuilder:printcolumn:name="Type",type=string,JSONPath=`.spec.type`
// +kubebuilder:printcolumn:name="Address",type=string,JSONPath=`.spec.externalAddress`
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Ready",type=integer,JSONPath=`.status.readyReplicas`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type ReverseProxyServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ReverseProxyServerSpec   `json:"spec,omitempty"`
	Status ReverseProxyServerStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
type ReverseProxyServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ReverseProxyServer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ReverseProxyServer{}, &ReverseProxyServerList{})
}
