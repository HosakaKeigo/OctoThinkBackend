import { describe, it, expect, vi } from "vitest";
import app from "../../../src/index.js";

vi.mock("../../../src/env.js");

const { mockCompletion } = vi.hoisted(() => ({
	mockCompletion: vi.fn(),
}));

vi.mock("../../../src/services/openai.service.js", () => {
	const mockOpenAIService = vi.fn().mockImplementation(() => ({
		completion: mockCompletion,
	}));

	return {
		OpenAIService: mockOpenAIService,
	};
});

describe("OpenAI Completion API", () => {
	it("should handle valid completion request", async () => {
		mockCompletion.mockResolvedValueOnce("Mock OpenAI response");

		const response = await app.request("/openai/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
				userPrompts: ["What is TypeScript?"],
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completion: "Mock OpenAI response" });
	});

	it("should return error for empty user prompts", async () => {
		const response = await app.request("/openai/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
			}),
		});

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined();
	});

	it("should handle service errors", async () => {
		mockCompletion.mockRejectedValueOnce(new Error("OpenAI service error"));

		const response = await app.request("/openai/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
				userPrompts: ["Hello"],
			}),
		});

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe("OpenAI service error");
	});

	it("should handle request with JSON response schema", async () => {
		mockCompletion.mockResolvedValueOnce('{"message": "Hello"}');

		const responseSchema = {
			type: "object",
			properties: {
				message: { type: "string" },
			},
			required: ["message"],
		};

		const response = await app.request("/openai/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
				userPrompts: ["Generate a greeting"],
				responseSchema,
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completion: '{"message": "Hello"}' });
	});

	it("should handle invalid request body", async () => {
		const response = await app.request("/openai/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				// Missing required fields
			}),
		});

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined();
	});
});
