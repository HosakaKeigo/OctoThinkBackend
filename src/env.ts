import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { secretsManagerService } from "./services/secretManager.service.js";

export const localEnv = createEnv({
	server: {
		/**
		 * Google Cloud Project ID. Used to access Cloud Secret Manager.
		 * Once Secrets are fetched, use secret to get project ID.
		 *
		 * Note: You can also get projectId from metadata-server in Google Cloud Environment.
		 * https://cloud.google.com/run/docs/container-contract#metadata-server
		 */
		GCLOUD_PROJECT_ID: z.string().describe("Google Cloud Project ID"),
		/**
		 * Cloud Secret Manager Secret Name
		 */
		SECRET_NAME: z.string().describe("Cloud Secret Manager Secret Name"),
		MAX_INPUT_LENGTH: z
			.string()
			.regex(/^\d+$/, "Must be a valid integer string")
			.transform((val) => Number.parseInt(val, 10))
			.pipe(z.number().positive())
			.describe("Maximum input length for AI models"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

/**
 * Fetches secrets from Google Cloud Secret Manager
 */
export async function fetchSecret() {
	// if you are running on Cloud Run, you can get from environment variable specified in deploy command.
	let secrets: string | null = null;
	const envSecret = process.env[localEnv.SECRET_NAME];
	if (envSecret) {
		secrets = envSecret;
		console.log("Secrets fetched from environment variable");
	} else {
		const secretManager = new secretsManagerService(localEnv.GCLOUD_PROJECT_ID);
		secrets = await secretManager.readSecret(localEnv.SECRET_NAME);
	}
	const secretJson = validateRequiredSecrets(secrets);
	return secretJson;
}

const SecretsSchema = z
	.object({
		OPENAI_API_KEY: z.string().describe("OpenAI API key for authentication"),
		AZURE_OPENAI_RESOURCE_NAME: z
			.string()
			.describe(
				"Resource name for Azure OpenAI service (e.g., 'your-azure-resource-name')",
			),
		AZURE_OPENAI_API_VERSION: z
			.string()
			.describe(
				"API version for Azure OpenAI service (e.g., '2024-08-01-preview')",
			),
		OPENAI_MODEL: z
			.string()
			.describe("OpenAI model identifier (e.g., 'gpt-4')"),
		GCLOUD_PROJECT_ID: z
			.string()
			.describe("Google Cloud project identifier (e.g., 'your-project-id')"),
		GCLOUD_LOCATION: z
			.string()
			.describe("Google Cloud region for the service (e.g., 'us-central1')"),
		GCLOUD_MODEL: z
			.string()
			.describe("Google Cloud model identifier (e.g., 'gemini-2.0-flash-exp')"),
		ANTHROPIC_MODEL: z
			.string()
			.describe(
				"Anthropic model identifier with version (e.g., 'claude-3-5-sonnet-v2@20241022')",
			),
		CLOUDFLARE_AI_GATEWAY: z
			.string()
			.url()
			.describe(
				"Cloudflare AI Gateway URL (e.g., 'https://gateway.ai.cloudflare.com/v1/xxxxx')",
			),
	})
	.strict()
	.partial({
		CLOUDFLARE_AI_GATEWAY: true,
		OPENAI_API_KEY: true,
		AZURE_OPENAI_RESOURCE_NAME: true,
		AZURE_OPENAI_API_VERSION: true,
		OPENAI_MODEL: true,
		ANTHROPIC_MODEL: true,
	});

export type Secrets = z.infer<typeof SecretsSchema>;

/**
 * Validates secrets retrieved from Cloud Secret Manager
 * @param secrets - Secrets as stringified JSON
 * @returns Validated secrets object
 * @throws {Error} When secrets are not found
 * @throws {ZodError} When validation fails
 */
export function validateRequiredSecrets(secrets: string | null): Secrets {
	if (!secrets) {
		throw new Error("Secrets not found");
	}

	let secretJson: unknown;
	try {
		secretJson = JSON.parse(secrets);
	} catch (e) {
		throw new Error("Invalid JSON format");
	}

	const result = SecretsSchema.safeParse(secretJson);

	if (!result.success) {
		const formattedErrors = result.error.issues
			.map((issue) => {
				if (issue.code === "invalid_type" && issue.received === "undefined") {
					return `Missing required secret: ${issue.path.join(".")}`;
				}
				if (issue.code === "unrecognized_keys") {
					return `Extra secrets found: ${issue.keys.join(", ")}`;
				}
				return `${issue.path.join(".")}: ${issue.message}`;
			})
			.join("\n");

		throw new Error(formattedErrors);
	}

	return result.data;
}
