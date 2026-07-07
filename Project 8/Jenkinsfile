pipeline {
    agent any

    environment {
        AWS_REGION      = 'us-east-1'
        AWS_ACCOUNT_ID  = credentials('cartflow-aws-account-id')
        ECR_REGISTRY    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_NAME      = 'cartflow'
        IMAGE_TAG       = "${BUILD_NUMBER}"
        CLUSTER_NAME    = 'cartflow-prod'
        APP_NAMESPACE   = 'cartflow'
        EKS_ADMIN_ROLE  = "arn:aws:iam::${AWS_ACCOUNT_ID}:role/cartflow-eks-admin-role"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Test') {
            steps {
                echo '── CartFlow: Running test suite ──'
                sh 'pip install -r app/requirements.txt --break-system-packages'
                sh 'pytest tests/ -v --tb=short'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "── CartFlow: Building image ${IMAGE_NAME}:${IMAGE_TAG} ──"
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
            }
        }

        stage('Push to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    echo '── CartFlow: Pushing image to ECR ──'
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}

                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REGISTRY}/${IMAGE_NAME}:latest

                        docker push ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/${IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Terraform Apply') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    echo '── CartFlow: Applying infrastructure changes ──'
                    dir('terraform') {
                        sh 'terraform init'
                        sh 'terraform plan -out=tfplan'
                        input message: 'Review Terraform plan. Apply changes to CartFlow production?'
                        sh 'terraform apply -auto-approve tfplan'
                    }
                }
            }
        }

        stage('Configure Nodes via Ansible SSM') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    echo '── CartFlow: Configuring EKS nodes via SSM ──'
                    sh """
                        export NODE1_ID=\$(aws ec2 describe-instances \
                            --region ${AWS_REGION} \
                            --filters \
                              "Name=tag:eks:cluster-name,Values=${CLUSTER_NAME}" \
                              "Name=instance-state-name,Values=running" \
                            --query 'Reservations[0].Instances[0].InstanceId' \
                            --output text)

                        export NODE2_ID=\$(aws ec2 describe-instances \
                            --region ${AWS_REGION} \
                            --filters \
                              "Name=tag:eks:cluster-name,Values=${CLUSTER_NAME}" \
                              "Name=instance-state-name,Values=running" \
                            --query 'Reservations[1].Instances[0].InstanceId' \
                            --output text)

                        echo "Node 1: \$NODE1_ID"
                        echo "Node 2: \$NODE2_ID"

                        pip install ansible-ssm --break-system-packages || true

                        cd ansible
                        ansible-playbook site.yml \
                            -e NODE1_ID=\$NODE1_ID \
                            -e NODE2_ID=\$NODE2_ID \
                            -v
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    echo '── CartFlow: Rolling out new version to EKS ──'
                    sh """
                        # Assume the EKS admin role via STS — no static cluster credentials
                        CREDS=\$(aws sts assume-role \
                            --role-arn ${EKS_ADMIN_ROLE} \
                            --role-session-name jenkins-deploy-${BUILD_NUMBER} \
                            --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
                            --output text)

                        export AWS_ACCESS_KEY_ID=\$(echo \$CREDS | awk '{print \$1}')
                        export AWS_SECRET_ACCESS_KEY=\$(echo \$CREDS | awk '{print \$2}')
                        export AWS_SESSION_TOKEN=\$(echo \$CREDS | awk '{print \$3}')

                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/configmap.yaml
                        kubectl apply -f k8s/deployment.yaml
                        kubectl apply -f k8s/service.yaml

                        kubectl set image deployment/cartflow-api \
                            cartflow-api=${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                            -n ${APP_NAMESPACE}

                        kubectl rollout status deployment/cartflow-api \
                            -n ${APP_NAMESPACE} \
                            --timeout=180s
                    """
                }
            }
        }

        stage('Smoke Test') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    echo '── CartFlow: Running post-deploy smoke test ──'
                    sh """
                        CREDS=\$(aws sts assume-role \
                            --role-arn ${EKS_ADMIN_ROLE} \
                            --role-session-name jenkins-smoke-${BUILD_NUMBER} \
                            --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
                            --output text)

                        export AWS_ACCESS_KEY_ID=\$(echo \$CREDS | awk '{print \$1}')
                        export AWS_SECRET_ACCESS_KEY=\$(echo \$CREDS | awk '{print \$2}')
                        export AWS_SESSION_TOKEN=\$(echo \$CREDS | awk '{print \$3}')

                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

                        SVC_URL=\$(kubectl get svc cartflow-api-service \
                            -n ${APP_NAMESPACE} \
                            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

                        echo "Service URL: \$SVC_URL"
                        sleep 10
                        curl -sf http://\$SVC_URL/health | grep '"status": "healthy"'
                        echo "Smoke test passed."
                    """
                }
            }
        }
    }

    post {
        success {
            echo "CartFlow build #${BUILD_NUMBER} deployed successfully to production."
        }
        failure {
            echo "CartFlow build #${BUILD_NUMBER} FAILED — review logs and rollback if needed."
        }
        always {
            sh 'docker rmi ${IMAGE_NAME}:${IMAGE_TAG} || true'
        }
    }
}
