# Node.js multibranch Docker and Kubernetes pipeline

This repository contains the supplied Express application and only the files
required to build, publish, and deploy it through Jenkins and Kubernetes.

## Environments

| Branch | Namespace | Replicas | Service |
|---|---|---:|---|
| `dev` | `node-app-dev` | 1 | ClusterIP |
| `stg` | `node-app-stg` | 2 | ClusterIP |
| `prod` | `node-app-prod` | 3 | LoadBalancer |
| `main` | `node-app-prod` | 3 | LoadBalancer |

`main` is supported as a production alias. Prefer the `prod` branch for new
production work.

## Jenkins requirements

The Jenkins agent needs Docker, `curl`, and `kubectl`. Configure these Jenkins
credentials:

- `docker`: Docker Hub username and access token
- `kubeconfig`: remote Kubernetes kubeconfig stored as a Secret File

Create a Multibranch Pipeline for this repository and include the `dev`, `stg`,
and `prod` branches. Each run performs:

```text
checkout -> build -> health smoke test -> Docker Hub push -> approval
-> Kubernetes apply -> rollout verification
```

The application listens on port `3000`. Its health endpoint is `/health`.
Aborting at the approval step leaves Kubernetes unchanged.
