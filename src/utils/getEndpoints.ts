import type { Secrets } from "../env.js";

interface Endpoints {
	azureOpenAI: string;
	gemini: string | undefined;
}

/**
 * Get Endpoints for each AI provider
 *
 * Use the Cloudflare AI Gateway URL if available.
 */
export const getEndpoints = (env: Secrets): Endpoints => {
	const gatewayUrl = env.CLOUDFLARE_AI_GATEWAY;
	if (gatewayUrl) {
		console.log("💡 Using Cloudflare AI Gateway");
		return {
			azureOpenAI: `${env.CLOUDFLARE_AI_GATEWAY}/azure-openai/${env.AZURE_OPENAI_RESOURCE_NAME}`,
			gemini: `${gatewayUrl.replace(/^https?:\/\//, "")}/google-vertex-ai`,
		};
	}

	console.log("Using direct AI provider endpoints");
	return {
		azureOpenAI: `https://${env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/openai/deployments/${env.OPENAI_MODEL}`,
		gemini: undefined,
	};
};
