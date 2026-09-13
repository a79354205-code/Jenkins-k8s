pipeline {
    agent any
    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }
    environment {
        APP_NAME = 'nodejs-docker-exercise'
        DOCKER_CREDENTIALS = 'docker'
        KUBECONFIG_CREDENTIAL = 'kubeconfig'
    }
    stages {
        stage('Prepare environment') {
            steps {
                checkout scm
                script {
                    def mapping = [dev: 'dev', stg: 'stg', prod: 'prod', main: 'prod']
                    if (!mapping.containsKey(env.BRANCH_NAME)) {
                        error("Branch '${env.BRANCH_NAME}' cannot deploy")
                    }
                    env.DEPLOY_ENV = mapping[env.BRANCH_NAME]
                    env.K8S_NAMESPACE = "node-app-${env.DEPLOY_ENV}"
                    env.SHORT_COMMIT = sh(script: 'git rev-parse --short=8 HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.DEPLOY_ENV}-${env.BUILD_NUMBER}-${env.SHORT_COMMIT}"
                }
            }
        }
        stage('Build Docker image') {
            steps {
                sh 'docker build --pull -t "$APP_NAME:$IMAGE_TAG" .'
            }
        }
        stage('Smoke test') {
            steps {
                sh '''
                    set -eu
                    id=$(docker run -d -p 127.0.0.1::3000 "$APP_NAME:$IMAGE_TAG")
                    trap 'docker rm -f "$id" >/dev/null 2>&1 || true' EXIT
                    port=$(docker port "$id" 3000/tcp | sed 's/.*://')
                    attempt=0
                    until curl -fsS "http://127.0.0.1:$port/health" >/dev/null; do
                        attempt=$((attempt + 1))
                        [ "$attempt" -lt 15 ] || { docker logs "$id"; exit 1; }
                        sleep 1
                    done
                '''
            }
        }
        stage('Push Docker image') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                        set -eu
                        printf '%s' "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                        docker tag "$APP_NAME:$IMAGE_TAG" "$DOCKER_USERNAME/$APP_NAME:$IMAGE_TAG"
                        docker push "$DOCKER_USERNAME/$APP_NAME:$IMAGE_TAG"
                        docker logout
                        printf '%s' "$DOCKER_USERNAME/$APP_NAME:$IMAGE_TAG" > image.txt
                    '''
                    script { env.DEPLOY_IMAGE = readFile('image.txt').trim() }
                }
            }
        }
        stage('Approve deployment') {
            steps {
                input(message: "Deploy ${env.DEPLOY_IMAGE} to ${env.DEPLOY_ENV} (${env.K8S_NAMESPACE})?", ok: 'Approve and deploy', submitterParameter: 'APPROVED_BY')
            }
        }
        stage('Deploy to remote Kubernetes') {
            steps {
                withCredentials([file(credentialsId: env.KUBECONFIG_CREDENTIAL, variable: 'KUBECONFIG')]) {
                    sh '''
                        set -eu
                        kubectl get namespace "$K8S_NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$K8S_NAMESPACE"
                        kubectl kustomize "k8s/overlays/$DEPLOY_ENV" | sed "s|IMAGE_PLACEHOLDER|$DEPLOY_IMAGE|g" > deployment.rendered.yaml
                        kubectl -n "$K8S_NAMESPACE" apply -f deployment.rendered.yaml
                        kubectl -n "$K8S_NAMESPACE" rollout status deployment/node-app --timeout=180s
                    '''
                }
            }
        }
    }
    post {
        aborted { echo 'Deployment aborted; Kubernetes was not changed.' }
        always {
            sh 'docker image rm "$APP_NAME:$IMAGE_TAG" >/dev/null 2>&1 || true'
            deleteDir()
        }
    }
}
