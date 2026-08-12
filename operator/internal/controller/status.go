package controller

import (
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func conditionStatus(ok bool) metav1.ConditionStatus {
	if ok {
		return metav1.ConditionTrue
	}
	return metav1.ConditionFalse
}

func setCondition(conditions *[]metav1.Condition, c metav1.Condition) {
	if c.Reason == "" {
		c.Reason = "Unknown"
	}
	meta.SetStatusCondition(conditions, c)
}

func serviceEndpoint(svc *corev1.Service, namespace string) string {
	internal := fmt.Sprintf("%s.%s.svc.cluster.local", svc.Name, namespace)
	port := int32(0)
	if len(svc.Spec.Ports) > 0 {
		port = svc.Spec.Ports[0].Port
	}

	switch svc.Spec.Type {
	case corev1.ServiceTypeLoadBalancer:
		for _, ing := range svc.Status.LoadBalancer.Ingress {
			if host := ing.Hostname; host != "" {
				return fmt.Sprintf("%s:%d", host, port)
			}
			if ip := ing.IP; ip != "" {
				return fmt.Sprintf("%s:%d", ip, port)
			}
		}
		return ""

	case corev1.ServiceTypeNodePort:
		if len(svc.Spec.Ports) > 0 && svc.Spec.Ports[0].NodePort != 0 {
			return fmt.Sprintf("<node-ip>:%d", svc.Spec.Ports[0].NodePort)
		}
		return internal

	default:
		return fmt.Sprintf("%s:%d", internal, port)
	}
}
