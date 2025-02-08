import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "../../../src/services/gemini.service.js";
import app from "../../../src/index.js";
import { fetchSecret } from "../../../src/env.js";
import { mock } from "node:test";

vi.mock("../../../src/env.js");

const { mockCompletion } = vi.hoisted(() => {
	return {
		mockCompletion: vi.fn(),
	};
});

vi.mock("../../../src/services/gemini.service.js", () => {
	const mockGeminiService = vi.fn().mockImplementation((arg) => {
		return {
			completion: mockCompletion,
		};
	});

	return {
		GeminiService: mockGeminiService,
	};
});

describe("Gemini Completion API", () => {
	it("should handle valid completion request", async () => {
		mockCompletion.mockResolvedValueOnce("Mock completion response");
		const response = await app.request("/gemini/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
				userPrompts: ["Hello, how are you?"],
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completion: "Mock completion response" });
	});

	it("should return error for empty user prompts", async () => {
		const response = await app.request("/gemini/completion", {
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
		mockCompletion.mockRejectedValue(new Error("Service error"));

		const response = await app.request("/gemini/completion", {
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
		expect(data.error).toBe("Service error");
	});

	it("should handle request with response schema", async () => {
		mockCompletion.mockResolvedValueOnce("Mock completion response");
		const responseSchema = {
			type: "object",
			properties: {
				message: { type: "string" },
			},
		};

		const response = await app.request("/gemini/completion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
				userPrompts: ["Hello"],
				responseSchema,
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completion: "Mock completion response" });
	});
});
