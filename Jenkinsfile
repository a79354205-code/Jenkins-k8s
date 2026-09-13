pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        APP_NAME = 'nodejs-docker-exercise'
        DOCKERHUB_NAMESPACE = 'abdelrahman12345648484'
        DOCKER_CREDENTIALS = 'docker'
    }

    stages {
        stage('Prepare environment') {
            steps {
                script {
                    def rawBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main'
                    def branchTag = rawBranch.replaceFirst('^origin/', '').replaceAll('[^A-Za-z0-9_.-]', '-')
                    env.SHORT_COMMIT = sh(script: 'git rev-parse --short=8 HEAD 2>/dev/null || echo "latest"', returnStdout: true).trim()
                    env.IMAGE_TAG = "${branchTag}-${env.BUILD_NUMBER}-${env.SHORT_COMMIT}"
                    env.IMAGE_REPOSITORY = "${env.DOCKERHUB_NAMESPACE}/${env.APP_NAME}"
                }
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'docker build --pull -t "$APP_NAME:$IMAGE_TAG" -t "$IMAGE_REPOSITORY:$IMAGE_TAG" .'
            }
        }

        stage('Smoke test') {
            steps {
                sh '''
                    set -eu
                    id=$(docker run -d -p 127.0.0.1::3000 "$APP_NAME:$IMAGE_TAG")
                    trap 'docker rm -f "$id" >/dev/null 2>&1 || true' EXIT

                    port=$(docker port "$id" 3000/tcp | head -n 1 | sed 's/.*://' | tr -dc '0-9')
                    attempt=0
                    until curl -fsS "http://127.0.0.1:$port/health" >/dev/null; do
                        attempt=$((attempt + 1))
                        if [ "$attempt" -ge 15 ]; then
                            echo "Smoke test failed! Container logs:"
                            docker logs "$id"
                            exit 1
                        fi
                        sleep 1
                    done
                    echo "Smoke test passed successfully on port $port!"
                '''
            }
        }

        stage('Push Docker image') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                        set -eu
                        printf '%s' "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                        docker push "$IMAGE_REPOSITORY:$IMAGE_TAG"
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker image rm -f "$APP_NAME:$IMAGE_TAG" "$IMAGE_REPOSITORY:$IMAGE_TAG" >/dev/null 2>&1 || true
                docker logout >/dev/null 2>&1 || true
            '''
            deleteDir()
        }
    }
}
