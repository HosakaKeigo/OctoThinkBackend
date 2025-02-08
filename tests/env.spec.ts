import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	afterEach,
	type Mock,
} from "vitest";
import { validateRequiredSecrets, fetchSecret } from "../src/env.js";
import { secretsManagerService } from "../src/services/secretManager.service.js";

const { mockReadSecret } = vi.hoisted(() => {
	return {
		mockReadSecret: vi.fn(),
	};
});

vi.mock("../src/services/secretManager.service.js", () => ({
	secretsManagerService: vi.fn().mockImplementation(() => ({
		readSecret: mockReadSecret,
	})),
}));

describe("fetchSecret", () => {
	const validSecretsString = JSON.stringify({
		OPENAI_API_KEY: "test-key",
		AZURE_OPENAI_RESOURCE_NAME: "test-resource",
		AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
		OPENAI_MODEL: "gpt-4",
		GCLOUD_PROJECT_ID: "test-project",
		GCLOUD_LOCATION: "us-central1",
		GCLOUD_MODEL: "gemini-2.0-flash-exp",
		ANTHROPIC_MODEL: "claude-3-5-sonnet-v2@20241022",
		CLOUDFLARE_AI_GATEWAY: "https://gateway.ai.cloudflare.com/v1/xxxxx",
	});

	it("should fetch secrets from environment variable when available", async () => {
		vi.stubEnv("test-secret", validSecretsString);
		const result = await fetchSecret();
		expect(result).toEqual(JSON.parse(validSecretsString));
		expect(secretsManagerService).not.toHaveBeenCalled();
	});

	it("should fetch secrets from Secret Manager when env variable is not available", async () => {
		mockReadSecret.mockResolvedValueOnce(validSecretsString);

		const result = await fetchSecret();
		expect(result).toEqual(JSON.parse(validSecretsString));
		expect(mockReadSecret).toHaveBeenCalledWith("test-secret");
	});

	it("should throw error when secrets are not found anywhere", async () => {
		mockReadSecret.mockResolvedValueOnce(null);
		await expect(fetchSecret()).rejects.toThrow("Secrets not found");
	});
});

describe("validateRequiredSecrets", () => {
	const validSecrets = {
		OPENAI_API_KEY: "test-key",
		AZURE_OPENAI_RESOURCE_NAME: "test-resource",
		AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
		OPENAI_MODEL: "gpt-4",
		GCLOUD_PROJECT_ID: "test-project",
		GCLOUD_LOCATION: "us-central1",
		GCLOUD_MODEL: "gemini-2.0-flash-exp",
		ANTHROPIC_MODEL: "claude-3-5-sonnet-v2@20241022",
		CLOUDFLARE_AI_GATEWAY: "https://gateway.ai.cloudflare.com/v1/xxxxx",
	};

	it("should validate correct secrets", () => {
		const result = validateRequiredSecrets(JSON.stringify(validSecrets));
		expect(result).toEqual(validSecrets);
	});

	it("should throw error when secrets are null", () => {
		expect(() => validateRequiredSecrets(null)).toThrow("Secrets not found");
	});

	it("should throw error for invalid JSON", () => {
		expect(() => validateRequiredSecrets("{invalid json}")).toThrow(
			"Invalid JSON format",
		);
	});

	it("should throw error for missing required secrets", () => {
		const incompleteSecrets = {
			OPENAI_API_KEY: "test-key",
			// Missing other required fields
		};

		expect(() =>
			validateRequiredSecrets(JSON.stringify(incompleteSecrets)),
		).toThrow(/Missing required secret: .*/);
	});

	it("should throw error for invalid URL format", () => {
		const invalidUrlSecrets = {
			...validSecrets,
			CLOUDFLARE_AI_GATEWAY: "invalid-url",
		};

		expect(() =>
			validateRequiredSecrets(JSON.stringify(invalidUrlSecrets)),
		).toThrow(/CLOUDFLARE_AI_GATEWAY: Invalid url/);
	});

	it("should throw error for extra secrets", () => {
		const extraSecrets = {
			...validSecrets,
			EXTRA_SECRET: "extra",
		};

		expect(() => validateRequiredSecrets(JSON.stringify(extraSecrets))).toThrow(
			/Extra secrets found: EXTRA_SECRET/,
		);
	});

	it("should throw error with multiple validation issues", () => {
		const multipleIssuesSecrets = {
			OPENAI_API_KEY: "test-key",
			EXTRA_FIELD1: "extra1",
			EXTRA_FIELD2: "extra2",
			CLOUDFLARE_AI_GATEWAY: "invalid-url",
		};

		const result = () =>
			validateRequiredSecrets(JSON.stringify(multipleIssuesSecrets));

		expect(result).toThrow();
		// Missing required fields
		expect(result).toThrow(/Missing required secret: GCLOUD_PROJECT_ID/);
		// Invalid URL
		expect(result).toThrow(/CLOUDFLARE_AI_GATEWAY: Invalid url/);
		// Extra fields
		expect(result).toThrow(/Extra secrets found: EXTRA_FIELD1, EXTRA_FIELD2/);
	});
});
