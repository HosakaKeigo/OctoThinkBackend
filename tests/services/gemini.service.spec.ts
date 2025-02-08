import { describe, expect, it, vi, beforeEach } from "vitest";
import { VertexAI } from "@google-cloud/vertexai";
import { GeminiService } from "../../src/services/gemini.service.js";
import type { Secrets } from "../../src/env.js";

const { mockGenerateContent } = vi.hoisted(() => {
	return {
		mockGenerateContent: vi.fn(),
	};
});

vi.mock("@google-cloud/vertexai", () => {
	return {
		VertexAI: vi.fn().mockImplementation(() => ({
			preview: {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: mockGenerateContent,
				}),
			},
		})),
	};
});

describe("GeminiService", () => {
	let service: GeminiService;
	const mockEnv: Secrets = {
		GCLOUD_PROJECT_ID: "test-project",
		GCLOUD_LOCATION: "test-location",
		GCLOUD_MODEL: "test-model",
	} as Secrets;

	it("should initialize successfully with valid environment variables", () => {
		expect(() => new GeminiService(mockEnv)).not.toThrow();
	});

	it("should throw error with invalid environment variables", () => {
		const invalidEnv = {
			...mockEnv,
			GCLOUD_PROJECT_ID: undefined,
		} as unknown as Secrets;
		expect(() => new GeminiService(invalidEnv)).toThrow();
	});

	describe("completion", () => {
		beforeEach(() => {
			service = new GeminiService(mockEnv);
		});

		it("should complete successfully with valid input", async () => {
			const mockResponse = { text: "test response" };
			mockGenerateContent.mockResolvedValueOnce({
				response: {
					candidates: [{ content: { parts: [mockResponse] } }],
				},
			});

			const result = await service.completion("system prompt", ["user prompt"]);

			expect(result).toBe(mockResponse.text);
			expect(mockGenerateContent).toHaveBeenCalledWith({
				contents: [
					{
						role: "USER",
						parts: [{ text: "user prompt" }],
					},
				],
				systemInstruction: "system prompt",
			});
		});

		it("should handle response schema when provided", async () => {
			const mockResponse = { text: '{"key": "value"}' };
			mockGenerateContent.mockResolvedValueOnce({
				response: {
					candidates: [{ content: { parts: [mockResponse] } }],
				},
			});

			const schema = {
				type: "object",
				properties: { key: { type: "string" } },
			};
			await service.completion("system prompt", ["user prompt"], schema);

			expect(mockGenerateContent).toHaveBeenCalledWith(
				expect.objectContaining({
					generationConfig: {
						responseMimeType: "application/json",
						responseSchema: schema,
					},
				}),
			);
		});

		it("should throw error when no candidates are returned", async () => {
			mockGenerateContent.mockResolvedValueOnce({
				response: { candidates: [] },
			});

			await expect(
				service.completion("system prompt", ["user prompt"]),
			).rejects.toThrow("No completion candidates found");
		});

		it("should throw error when API call fails", async () => {
			mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));

			await expect(
				service.completion("system prompt", ["user prompt"]),
			).rejects.toThrow("API Error");
		});
	});
});
