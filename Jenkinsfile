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
    }
    stages {
        stage('Prepare environment') {
            steps {
                checkout scm
                script {
                    def branchTag = env.BRANCH_NAME.replaceAll('[^A-Za-z0-9_.-]', '-')
                    env.SHORT_COMMIT = sh(script: 'git rev-parse --short=8 HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${branchTag}-${env.BUILD_NUMBER}-${env.SHORT_COMMIT}"
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
                    '''
                }
            }
        }
    }
    post {
        always {
            sh 'docker image rm "$APP_NAME:$IMAGE_TAG" >/dev/null 2>&1 || true'
            deleteDir()
        }
    }
}
