# Node.js Docker pipeline

This repository contains the supplied Express application and the files needed
to build, test, and publish its Docker image through Jenkins.

## Application

The service listens on port `3000` and provides:

- `GET /` — application information
- `GET /health` — container health status

## Jenkins requirements

The Jenkins agent needs Docker and `curl`. Add a Jenkins username/password
credential named `docker`, using your Docker Hub username and access token.
The credential must have permission to push to the
`abdelrahman12345648484` Docker Hub namespace.

Create a Multibranch Pipeline for this repository. Each branch run performs:

```text
checkout -> Docker build -> container health test -> Docker Hub push
```

Images are published as:

```text
abdelrahman12345648484/nodejs-docker-exercise:<branch>-<build>-<commit>
```

To run the application locally:

```bash
docker build -t nodejs-docker-exercise .
docker run --rm -p 3000:3000 nodejs-docker-exercise
```
