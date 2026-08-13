package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +kubebuilder:validation:Enum=STATEFUL;STATELESS
type ServerKind string

const (
	ServerStateful  ServerKind = "STATEFUL"
	ServerStateless ServerKind = "STATELESS"
)

// +kubebuilder:validation:Enum=VANILLA;PAPER;SPIGOT;PURPUR;FABRIC;FORGE;FOLIA
type JarType string

// +kubebuilder:validation:Enum=PEACEFUL;EASY;NORMAL;HARD
type Difficulty string

// +kubebuilder:validation:Enum=SURVIVAL;CREATIVE;ADVENTURE;SPECTATOR
type GameMode string

type MinecraftProperties struct {
	// +kubebuilder:default=EASY
	Difficulty Difficulty `json:"difficulty,omitempty"`

	// +kubebuilder:default=SURVIVAL
	GameMode GameMode `json:"gameMode,omitempty"`

	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:default=20
	MaxPlayers int32 `json:"maxPlayers,omitempty"`

	// +kubebuilder:default=true
	PVP *bool `json:"pvp,omitempty"`

	// +kubebuilder:default=true
	OnlineMode *bool `json:"onlineMode,omitempty"`

	// +optional
	MOTD string `json:"motd,omitempty"`

	// +optional
	LevelSeed string `json:"levelSeed,omitempty"`

	// +optional
	LevelType string `json:"levelType,omitempty"`
}

type JVMOptions struct {
	// +optional
	Opts string `json:"opts,omitempty"`

	// +optional
	UseAikarFlags bool `json:"useAikarFlags,omitempty"`

	// +optional
	UseMeowIceFlags bool `json:"useMeowIceFlags,omitempty"`

	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=100
	// +kubebuilder:default=60
	HeapPercent int32 `json:"heapPercent,omitempty"`
}

type MinecraftServerSpec struct {
	Type ServerKind `json:"type"`

	// +kubebuilder:default=true
	Running *bool `json:"running,omitempty"`

	// +optional
	Description string `json:"description,omitempty"`

	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=65535
	// +kubebuilder:default=25565
	ListenPort int32 `json:"listenPort,omitempty"`

	// +kubebuilder:default=ClusterIP
	ServiceType ServiceExposure `json:"serviceType,omitempty"`

	// +optional
	// +kubebuilder:validation:Minimum=30000
	// +kubebuilder:validation:Maximum=32767
	NodePort int32 `json:"nodePort,omitempty"`

	// +kubebuilder:default=VANILLA
	JarType JarType `json:"jarType,omitempty"`

	// +kubebuilder:default="LATEST"
	MinecraftVersion string `json:"minecraftVersion,omitempty"`

	// +optional
	Resources Resources `json:"resources,omitempty"`

	// +optional
	JVM JVMOptions `json:"jvm,omitempty"`

	// +optional
	Properties MinecraftProperties `json:"properties,omitempty"`

	// +optional
	Env []EnvVar `json:"env,omitempty"`

	// +optional
	APIKeySecretRef string `json:"apiKeySecretRef,omitempty"`

	// +kubebuilder:default="1Gi"
	StorageSize string `json:"storageSize,omitempty"`
}

type MinecraftServerStatus struct {
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
// +kubebuilder:resource:shortName=mcs
// +kubebuilder:printcolumn:name="Type",type=string,JSONPath=`.spec.type`
// +kubebuilder:printcolumn:name="Version",type=string,JSONPath=`.spec.minecraftVersion`
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Ready",type=integer,JSONPath=`.status.readyReplicas`
// +kubebuilder:printcolumn:name="Endpoint",type=string,JSONPath=`.status.endpoint`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type MinecraftServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MinecraftServerSpec   `json:"spec,omitempty"`
	Status MinecraftServerStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
type MinecraftServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MinecraftServer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MinecraftServer{}, &MinecraftServerList{})
}
