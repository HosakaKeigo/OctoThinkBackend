#!/bin/bash

# Variables
SERVICE_NAME="multi-llm"
REGION="us-central1"
SECRET_NAME="multi-llm-secrets" # Should be same as defined in .env.yaml

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "Error: プロジェクトIDを取得できませんでした。'gcloud config set project YOUR_PROJECT_ID' で設定するか、GOOGLE_CLOUD_PROJECT環境変数を利用してください。"
  exit 1
fi
echo "Project ID: $PROJECT_ID"

CLOUD_RUN_SA="cloud-run-multi-llm-backend"
CLOUD_RUN_SA_EMAIL="$CLOUD_RUN_SA@$PROJECT_ID.iam.gserviceaccount.com"

# Validate .env.yaml
if [ ! -f ".env.yaml" ]; then
  echo "Error: .env.yaml が見つかりません"
  exit 1
fi

# Deploy to Cloud Run
# Note: Secret version is set to "latest" but recommended to use specific version.
# See: https://cloud.google.com/run/docs/configuring/services/secrets#access-secrets
echo "Deploying to Cloud Run..."
if gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --service-account $CLOUD_RUN_SA_EMAIL \
  --env-vars-file=.env.yaml \
  --update-secrets="${SECRET_NAME}=${SECRET_NAME}:latest" \
  --no-allow-unauthenticated; then
  echo "Deployment complete!"
else
  echo "Deployment failed!"
  exit 1
fi
