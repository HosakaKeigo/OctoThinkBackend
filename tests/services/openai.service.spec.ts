import { describe, expect, it, vi, beforeEach } from "vitest";
import { OpenAIService } from "../../src/services/openai.service.js";
import type { Secrets } from "../../src/env.js";

const { mockCreateChatCompletion } = vi.hoisted(() => {
	return {
		mockCreateChatCompletion: vi.fn(),
	};
});

vi.mock("openai", () => {
	const AzureOpenAI = vi.fn(() => ({
		chat: {
			completions: {
				create: mockCreateChatCompletion,
			},
		},
	}));
	return { AzureOpenAI };
});

describe("OpenAIService", () => {
	let service: OpenAIService;
	const mockEnv: Secrets = {
		OPENAI_API_KEY: "test-api-key",
		OPENAI_MODEL: "gpt-4o",
		AZURE_OPENAI_RESOURCE_NAME: "test-resource",
		AZURE_OPENAI_API_VERSION: "2024-08-01-preview",
	} as Secrets;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize successfully with valid environment variables", () => {
		expect(() => new OpenAIService(mockEnv)).not.toThrow();
	});

	it("should throw error with invalid environment variables", () => {
		const invalidEnv = {
			...mockEnv,
			OPENAI_API_KEY: undefined,
		} as unknown as Secrets;
		expect(() => new OpenAIService(invalidEnv)).toThrow();
	});

	describe("completion", () => {
		beforeEach(() => {
			service = new OpenAIService(mockEnv);
		});

		it("should complete successfully with valid input", async () => {
			const mockResponse = { content: "test response" };
			mockCreateChatCompletion.mockResolvedValueOnce({
				choices: [{ message: mockResponse }],
			});

			const result = await service.completion("system prompt", ["user prompt"]);

			expect(result).toBe(mockResponse.content);
			expect(mockCreateChatCompletion).toHaveBeenCalledWith({
				messages: [
					{ role: "system", content: "system prompt" },
					{ role: "user", content: "user prompt" },
				],
				model: mockEnv.OPENAI_MODEL,
			});
		});

		it("should handle response schema when provided", async () => {
			const mockResponse = { content: '{"key": "value"}' };
			mockCreateChatCompletion.mockResolvedValueOnce({
				choices: [{ message: mockResponse }],
			});

			const schema = {
				type: "object",
				properties: { key: { type: "string" } },
			};
			await service.completion("system prompt", ["user prompt"], schema);

			expect(mockCreateChatCompletion).toHaveBeenCalledWith(
				expect.objectContaining({
					response_format: {
						json_schema: {
							name: "response",
							schema: {
								properties: {
									key: {
										type: "string",
									},
								},
								type: "object",
							},
						},
						type: "json_schema",
					},
				}),
			);
		});

		it("should return empty string when no choices are returned", async () => {
			mockCreateChatCompletion.mockResolvedValueOnce({
				choices: [],
			});

			expect(
				service.completion("system prompt", ["user prompt"]),
			).resolves.toBe("");
		});

		it("should throw error when API call fails", async () => {
			mockCreateChatCompletion.mockRejectedValueOnce(new Error("API Error"));

			await expect(
				service.completion("system prompt", ["user prompt"]),
			).rejects.toThrow("API Error");
		});

		it("should handle multiple user prompts", async () => {
			const mockResponse = { content: "test response" };
			mockCreateChatCompletion.mockResolvedValueOnce({
				choices: [{ message: mockResponse }],
			});

			await service.completion("system prompt", ["prompt 1", "prompt 2"]);

			expect(mockCreateChatCompletion).toHaveBeenCalledWith(
				expect.objectContaining({
					messages: [
						{ role: "system", content: "system prompt" },
						{ role: "user", content: "prompt 1" },
						{ role: "user", content: "prompt 2" },
					],
				}),
			);
		});
	});
});
