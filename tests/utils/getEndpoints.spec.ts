import { describe, it, expect } from "vitest";
import { getEndpoints } from "../../src/utils/getEndpoints.js";

describe("getEndpoints", () => {
	it("should return correct URLs when using Cloudflare AI Gateway", () => {
		const mockEnv = {
			CLOUDFLARE_AI_GATEWAY: "https://example.com",
			AZURE_OPENAI_RESOURCE_NAME: "myResource",
			OPENAI_MODEL: "gpt-4",
		};
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = getEndpoints(mockEnv as any);
		expect(result.azureOpenAI).toBe(
			"https://example.com/azure-openai/myResource",
		);
		expect(result.gemini).toBe("example.com/google-vertex-ai");
	});

	it("should return direct endpoints when AI Gateway is not provided", () => {
		const mockEnv = {
			AZURE_OPENAI_RESOURCE_NAME: "myResource",
			OPENAI_MODEL: "gpt-4",
		};
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = getEndpoints(mockEnv as any);
		expect(result.azureOpenAI).toBe(
			"https://myResource.openai.azure.com/openai/deployments/gpt-4",
		);
		expect(result.gemini).toBeUndefined();
	});

	it("should handle empty string for AI Gateway", () => {
		const mockEnv = {
			CLOUDFLARE_AI_GATEWAY: "",
			AZURE_OPENAI_RESOURCE_NAME: "myResource",
			OPENAI_MODEL: "gpt-4",
		};
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result = getEndpoints(mockEnv as any);
		expect(result.azureOpenAI).toBe(
			"https://myResource.openai.azure.com/openai/deployments/gpt-4",
		);
		expect(result.gemini).toBeUndefined();
	});
});
