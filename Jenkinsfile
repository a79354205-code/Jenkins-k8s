pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        choice(name: 'TARGET_BRANCH', choices: ['dev', 'stg', 'prod', 'main'], description: 'Branch to build and publish (used when triggered manually)')
    }

    environment {
        APP_NAME = 'nodejs-docker-exercise'
        DOCKERHUB_NAMESPACE = 'abdelrahman12345648484'
        DOCKER_CREDENTIALS = 'docker-hub-credentials'
    }

    stages {
        stage('Prepare environment') {
            steps {
                script {
                    def chosenBranch = env.BRANCH_NAME ?: params.TARGET_BRANCH ?: env.GIT_BRANCH ?: 'dev'
                    def branchTag = chosenBranch.replaceFirst('^origin/', '').replaceAll('[^A-Za-z0-9_.-]', '-')
                    env.SHORT_COMMIT = sh(script: 'git rev-parse --short=8 HEAD 2>/dev/null || echo "latest"', returnStdout: true).trim()
                    env.IMAGE_TAG = "${branchTag}-${env.BUILD_NUMBER}-${env.SHORT_COMMIT}"
                    env.IMAGE_REPOSITORY = "${env.DOCKERHUB_NAMESPACE}/${env.APP_NAME}"
                    env.BRANCH_TAG = "${branchTag}"
                    echo "Building image for branch: ${branchTag} with tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Build Docker image') {
            steps {
                sh '''
                    docker build --pull -t "$APP_NAME:$IMAGE_TAG" -t "$IMAGE_REPOSITORY:$IMAGE_TAG" -t "$IMAGE_REPOSITORY:$BRANCH_TAG-latest" .
                '''
            }
        }

        stage('Smoke test') {
            steps {
                sh '''
                    set -eu
                    id=$(docker run -d "$APP_NAME:$IMAGE_TAG")
                    trap 'docker rm -f "$id" >/dev/null 2>&1 || true' EXIT

                    attempt=0
                    until docker exec "$id" node -e "fetch('http://127.0.0.1:3000/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"; do
                        attempt=$((attempt + 1))
                        if [ "$attempt" -ge 15 ]; then
                            echo "Smoke test failed! Container logs:"
                            docker logs "$id"
                            exit 1
                        fi
                        sleep 1
                    done
                    echo "Smoke test passed successfully for $APP_NAME:$IMAGE_TAG!"
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
                        docker push "$IMAGE_REPOSITORY:$BRANCH_TAG-latest"
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker image rm -f "$APP_NAME:$IMAGE_TAG" "$IMAGE_REPOSITORY:$IMAGE_TAG" "$IMAGE_REPOSITORY:$BRANCH_TAG-latest" >/dev/null 2>&1 || true
                docker logout >/dev/null 2>&1 || true
            '''
            deleteDir()
        }
    }
}
