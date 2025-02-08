# Multi-LLM Backend
Structured multi-LLM backend for handling multiple LLMs simultaneously.

## Stacks
- Hono.js: Framework
- T3 Env: Environment Variables Management
- Vitest: Testing
- Cloud Run
  - Require Authorized invocation
- Google Secret Manager

## Interface
### Endpoints
- POST: `/<provider>/completion`
- POST: `/multi/completion`
  - This calls multiple LLMs simultaneously and returns each result.

### Request
```json
{
  "systemPrompt": "string",
  "userPrompts": [
    "string"
  ],
  "responseSchema": "string"
}
```

> [!Warning]
> `responseSchema` expects a subset of OpenAPI Schema and differs between providers.
> It may not work for complex schemas.

### Response
```json
{
  "completion": "string"
}
```

For Multi-LLM endpoint.

```json
{
  "systemPrompt": "string",
  "userPrompts": [
    "string"
  ],
  "completions": [
    {
      "completion": "string",
      "providers": [
        "string",
      ]
    }
  ]
}
```

## Supported LLM
You can add Azure OpenAI by adding necessary values in your secrets.

- Gemini on Vertex AI (Required)
  - GCLOUD_PROJECT_ID
  - GCLOUD_MODEL
- Azure OpenAI
  - OPENAI_API_KEY
  - AZURE_OPENAI_RESOURCE_NAME
  - OPENAI_MODEL

>[!tip]
> You can optionally set `CLOUDFLARE_AI_GATEWAY` to use [Cloudflare AI Gateway](https://www.cloudflare.com/ja-jp/developer-platform/products/ai-gateway/).

## Setup Guide
### 1. Create Secrets on Google Secret Manager
See `/src/env.ts` for required secrets.

Minimum required secrets are:

- GCLOUD_PROJECT_ID
- GCLOUD_LOCATION
- GCLOUD_MODEL

Note that secret is a single stringified JSON object.
See `.secret.local/_example` for an example.

### 2. Create Environment Variables
- .env
  - For local development. See `.env.example`.
- .env.yaml
  - For Cloud Run. See `.env.example.yaml`.
  - If you use GitHub Actions, you can omit this file.

### 3. Setup Google Cloud（Enable APIs, Service Account, etc.）
`init.sh` provides easy setup for things like enabling APIs, creating service account, preparing Workload Identity Federation, etc.

```
$gcloud auth login
$gcloud config set project <project-id>

$chmod +x init.sh
$./init.sh
```

Script may fail first time due to API enabling delay, service account creation delay, etc.
Try again after a few seconds.

>[!Note]
>Trigger branch for GitHub Actions is not set to `main` by default.
>Edit `.github/workflows/deploy.yml` if needed.

Also configure variables in `.deploy.sh`.

### 4. Setup Repository Secrets
GitHub Actions requires the following secrets:

- GCLOUD_PROJECT_ID
  - Secret Manger's project id
- SECRET_NAME
  - Secret Manger's secret name
- SERVICE_ACCOUNT
  - `<name>@<project-id>.iam.gserviceaccount.com`
- WORKLOAD_IDENTITY_PROVIDER
  - `projects/<project-number>/locations/global/workloadIdentityPools/<pool-id>/providers/<provider-id>`

https://docs.github.com/ja/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository

### 5. Check Locally
```sh
$pnpm install
$pnpm dev
```

>[!tip]
>You can emulate secret by creating `.secret.local/<your-secret-name>`.

>[!tip]
>You can check openapi spec by visiting `http://localhost:8080/ui`.

### 6. Deploy 🚀
You can deploy to Cloud Run manually or with GitHub Actions.

#### Manual
You should create `.env.yaml` before deploying.

```
$chmod +x deploy.sh
$./deploy.sh
```

#### GitHub Actions
You need to set up Workload Identity and other necessary configurations.
Make sure you have correctly run `init.sh`.


>[!tip]
>For deployed Cloud Run you need an authorized invocation. If you want to test your deployed instance, use proxy.
>
> `$gcloud run services proxy <service-name>`
>
> See: https://cloud.google.com/sdk/gcloud/reference/run/services/proxy
