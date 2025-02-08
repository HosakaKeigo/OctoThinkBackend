#!/bin/bash

# Credit: https://blog.g-gen.co.jp/entry/create-workload-identity-for-gha-terraform

set -e

PROJECT_ID="" # Project ID (ex: gha-demo-prj)
PROJECT_NUMBER="" # Project Number (ex: 1234567890)
WORKLOAD_IDENTITY_POOL="" # Workload Identity Pool Name (ex: gha-demo-pool)
WORKLOAD_IDENTITY_PROVIDER="" # Workload Identity Provider Name(ex: gha-demo-provider)
SERVICE_ACCOUNT_NAME="" # サービスアカウント名 (ex: gha-demo-sa)
GITHUB_REPO="" # Your GitHub Repo Name (ex: gha-demo-org/gha-demo-repo)

# Cloud Run Service Account
CLOUD_RUN_SA="cloud-run-multi-llm-backend"
CLOUD_RUN_SA_EMAIL="$CLOUD_RUN_SA@$PROJECT_ID.iam.gserviceaccount.com"

# ログ出力関数
log() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

# 変数のチェック: すべての変数が設定されているか確認
if [[ -z "$PROJECT_ID" || -z "$PROJECT_NUMBER" || -z "$WORKLOAD_IDENTITY_POOL" || -z "$WORKLOAD_IDENTITY_PROVIDER" || -z "$SERVICE_ACCOUNT_NAME" || -z "$GITHUB_REPO" || -z "$CLOUD_RUN_SA" || -z "$CLOUD_RUN_SA_EMAIL" ]]; then
    log_error "必須の変数が設定されていません。変数を確認してください。"
    exit 1
fi

# 必要な API の有効化
APIS=(
    "iamcredentials.googleapis.com"  # IAM Credentials API
    "run.googleapis.com"             # Cloud Run Admin API
    "cloudbuild.googleapis.com"      # Cloud Build API
    "aiplatform.googleapis.com"
)

for api in "${APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep "$api" >/dev/null 2>&1; then
        log "$api を有効にしています..."
        gcloud services enable "$api" --project="$PROJECT_ID"
    else
        log "$api は既に有効化されています"
    fi
done

# 2. サービスアカウントの作成
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com >/dev/null 2>&1; then
    log "サービスアカウントを作成中: $SERVICE_ACCOUNT_NAME"
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --project="$PROJECT_ID" \
        --display-name="GitHub Actions Service Account"
else
    log "サービスアカウントは既に存在します: $SERVICE_ACCOUNT_NAME"
fi

# 3. Cloud Run の実行サービスアカウントを作成
if ! gcloud iam service-accounts describe "$CLOUD_RUN_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Cloud Run 用のサービスアカウントを作成: $CLOUD_RUN_SA_EMAIL"
    gcloud iam service-accounts create "$CLOUD_RUN_SA" \
        --display-name "Cloud Run Execution Service Account" \
        --project "$PROJECT_ID"
else
    log "Cloud Run 用のサービスアカウントは既に存在します: $CLOUD_RUN_SA_EMAIL"
fi

# 4. Workload Identity プールの作成
if ! gcloud iam workload-identity-pools describe $WORKLOAD_IDENTITY_POOL --location="global" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Workload Identity プールを作成中: $WORKLOAD_IDENTITY_POOL"
    gcloud iam workload-identity-pools create $WORKLOAD_IDENTITY_POOL \
        --project="$PROJECT_ID" \
        --location="global" \
        --display-name="$WORKLOAD_IDENTITY_POOL"
else
    log "Workload Identity プールは既に存在します: $WORKLOAD_IDENTITY_POOL"
fi

# 5. Workload Identity プロバイダの作成
if ! gcloud iam workload-identity-pools providers describe $WORKLOAD_IDENTITY_PROVIDER --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" --location="global" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Workload Identity プロバイダを作成中: $WORKLOAD_IDENTITY_PROVIDER"
    gcloud iam workload-identity-pools providers create-oidc $WORKLOAD_IDENTITY_PROVIDER \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" \
        --display-name="$WORKLOAD_IDENTITY_PROVIDER" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository=='$GITHUB_REPO'"
else
    log "Workload Identity プロバイダは既に存在します: $WORKLOAD_IDENTITY_PROVIDER"
fi

# 6. Workload Identity プールと GitHub リポジトリのリンク作成
log "Workload Identity プールと GitHub リポジトリのリンク作成の確認"
for subject in \
    "principal://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/subject/$GITHUB_REPO" \
    "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/attribute.repository/$GITHUB_REPO"; do
    if ! gcloud iam service-accounts get-iam-policy "$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
        --flatten="bindings[].members" \
        --filter="bindings.members:$subject" \
        --format="value(bindings.role)" | grep "roles/iam.workloadIdentityUser" >/dev/null 2>&1; then
        log "Workload Identity プールと GitHub リポジトリのリンクを作成中: $subject"
        gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/iam.workloadIdentityUser" \
            --member="$subject"
    else
        log "Workload Identity プールと GitHub リポジトリのリンクは既に設定されています: $subject"
    fi
done
log "Workload Identity 設定が完了しました。"
log "サービスアカウント: $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# 7. サービスアカウントに追加のロールを付与する
for role in "roles/artifactregistry.admin" \
            "roles/storage.admin" \
            "roles/cloudbuild.builds.editor" \
            "roles/serviceusage.serviceUsageConsumer" \
            "roles/iam.workloadIdentityUser" \
            "roles/iam.serviceAccountUser" \
            "roles/run.admin"; do
    if ! gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com AND bindings.role:$role" \
        --format="value(bindings.role)" | grep "$role" >/dev/null 2>&1; then
        log "$role をサービスアカウントに付与中: $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="$role"
    else
        log "$role は既にサービスアカウントに付与されています: $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
    fi
done

# 8. Cloud Run 実行アカウントにロールを付与
for role in "roles/editor" \
            "roles/aiplatform.user" \
            "roles/secretmanager.secretAccessor"; do
    if ! gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --filter="bindings.members:serviceAccount:$CLOUD_RUN_SA_EMAIL AND bindings.role:$role" \
        --format="value(bindings.role)" | grep "$role" >/dev/null 2>&1; then
        log "$role を Cloud Run の実行サービスアカウントに付与中: $CLOUD_RUN_SA_EMAIL"
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
            --role="$role"
    else
        log "$role は既に Cloud Run の実行サービスアカウントに付与されています: $CLOUD_RUN_SA_EMAIL"
    fi
done

log "すべてのロールの付与が完了しました。"

IDENTITY_PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/providers/${WORKLOAD_IDENTITY_PROVIDER}"
log "GitHub Actions で使用するサービスアカウントの Workload Identity プール: $IDENTITY_PROVIDER_RESOURCE"
log "GitHub Actions で使用するサービスアカウント: $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
