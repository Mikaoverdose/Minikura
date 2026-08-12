# ⛏️ Minikura ミニクラ  
**Manage Minecraft servers effortlessly for Kubernetes**

Minikura is designed to simplify the management and deployment of Minecraft servers within Kubernetes clusters. From SMP server to network of minigames, or mix of those.

🚧 **Note:** Minikura is in heavy development and very incomplete. Its scope, features, and roadmap are subject to change as the project evolves.

## Kubernetes Operator

Install the checked-in CRDs, least-privilege RBAC, service accounts, and operator Deployment into the current Kubernetes context:

```sh
OPERATOR_IMAGE=registry.example.com/minikura-operator:tag bun run setup
```

`OPERATOR_IMAGE` defaults to `minikura-operator:latest` for clusters where that image is already available. Set `KUBERNETES_NAMESPACE` to install outside `minikura` and `ROLLOUT_TIMEOUT` to change the default `120s` readiness timeout. An in-cluster backend Deployment must use the `minikura-backend` service account in the same namespace.

Operator-managed proxy pods use `MINIKURA_OPERATOR_BACKEND_URL` to reach the backend, defaulting to `http://minikura-backend:3000/api`. Set `MINIKURA_VELOCITY_PLUGIN_URL` to comma-separated RedisBungee and shaded Minikura Velocity plugin JAR URLs to install both required plugins in Velocity pods.

Run `bun run operator:validate` for shell syntax and client-side Kubernetes manifest validation without connecting to a cluster.

---

## 🚀 Planned Feature Set

### Core Features
- [ ] **Server Management**  
   - [ ] Manage **stateless** servers (e.g., minigames)
   - [ ] Manage **stateful** servers (e.g., SMP)
   - [x] Manage **Velocity reverse proxy** servers
   - [ ] Dynamic scaling for stateless server

- [ ] **Integration with Velocity**
   - [x] Dynamically manage backends
   - [x] **Proxy Transfers** - Seamlessly transfer players between proxies
   - [x] [ValioBungee](https://www.spigotmc.org/resources/valiobungee.87700/) (RedisBungee) integration
   - [ ] **Load Balancing**

### User Experience
- [ ] **Frontend**  
   - Web interface for managing servers and configurations.  

### Kubernetes
- [ ] **Managed deployment in Kubernetes Clusters**

---

## 📌 Additional Features In Consideration  

### Advanced Server Management
- [ ] Automatic backups and restore
- [ ] Scheduled server start/stop to save resources 

### Plugins
- [ ] Management for server jar versions, plugins, and mods

### API & Extensibility
- [ ] REST/GraphQL API for programmatic control
