package v1alpha1

import corev1 "k8s.io/api/core/v1"

const (
	Domain      = "minikura.kirameki.cafe"
	LabelPrefix = Domain

	LabelServerType = LabelPrefix + "/server-type"
	LabelServerID   = LabelPrefix + "/server-id"
	LabelProxyID    = LabelPrefix + "/proxy-id"
	LabelManagedBy  = LabelPrefix + "/managed-by"

	ManagerName = "minikura-operator"

	PhasePending = "Pending"
	PhaseRunning = "Running"
	PhaseFailed  = "Failed"

	ConditionReady = "Ready"
)

// +kubebuilder:validation:XValidation:rule="!(has(self.value) && has(self.valueFrom))",message="value and valueFrom are mutually exclusive"
type EnvVar struct {
	Name string `json:"name"`

	// +optional
	Value string `json:"value,omitempty"`

	// +optional
	ValueFrom *corev1.EnvVarSource `json:"valueFrom,omitempty"`
}

// +kubebuilder:validation:Enum=ClusterIP;NodePort;LoadBalancer
type ServiceExposure string

const (
	ExposureClusterIP    ServiceExposure = "ClusterIP"
	ExposureNodePort     ServiceExposure = "NodePort"
	ExposureLoadBalancer ServiceExposure = "LoadBalancer"
)

type Resources struct {
	// +kubebuilder:validation:Minimum=256
	// +kubebuilder:default=2048
	MemoryLimitMB int32 `json:"memoryLimitMB,omitempty"`

	// +optional
	// +kubebuilder:validation:Minimum=256
	MemoryRequestMB int32 `json:"memoryRequestMB,omitempty"`

	// +kubebuilder:default="500m"
	CPURequest string `json:"cpuRequest,omitempty"`

	// +kubebuilder:default="2"
	CPULimit string `json:"cpuLimit,omitempty"`
}
