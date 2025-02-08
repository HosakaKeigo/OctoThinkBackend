import { describe, it, expect, vi } from "vitest";
import app from "../../../src/index.js";

vi.mock("../../../src/env.js");

const mockServices = {
	openai: vi.fn(),
	gemini: vi.fn(),
};

vi.mock("../../../src/services/openai.service.js", () => ({
	OpenAIService: vi.fn().mockImplementation(() => ({
		completion: mockServices.openai,
	})),
}));

vi.mock("../../../src/services/gemini.service.js", () => ({
	GeminiService: vi.fn().mockImplementation(() => ({
		completion: mockServices.gemini,
	})),
}));

describe("Multi Provider Completion API", () => {
	it("should handle successful completion from multiple providers", async () => {
		mockServices.openai.mockResolvedValueOnce("OpenAI response");
		mockServices.gemini.mockResolvedValueOnce("Gemini response");

		const response = await app.request("/multi/completion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemPrompt: "You are a helpful assistant",
				userPrompts: ["Hello"],
				providers: ["openai", "gemini"],
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.completions).toHaveLength(2);
		expect(data.completions).toEqual(
			expect.arrayContaining([
				{ provider: "openai", completion: "OpenAI response" },
				{ provider: "gemini", completion: "Gemini response" },
			]),
		);
	});

	it("should handle partial provider failures", async () => {
		mockServices.openai.mockResolvedValueOnce("OpenAI response");
		mockServices.gemini.mockRejectedValueOnce(new Error("Gemini error"));

		const response = await app.request("/multi/completion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemPrompt: "Test prompt",
				userPrompts: ["Test"],
				providers: ["openai", "gemini"],
			}),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.completions).toHaveLength(2);
		expect(data.completions).toEqual(
			expect.arrayContaining([
				{ provider: "openai", completion: "OpenAI response" },
				{
					provider: "gemini",
					completion: "Error [UNKNOWN_ERROR]: Gemini error",
				},
			]),
		);
	});

	it("should handle empty providers array", async () => {
		const response = await app.request("/multi/completion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemPrompt: "Test prompt",
				userPrompts: ["Test"],
				providers: [],
			}),
		});

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined();
	});

	it("should handle invalid provider names", async () => {
		const response = await app.request("/multi/completion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemPrompt: "Test prompt",
				userPrompts: ["Test"],
				providers: ["invalid-provider"],
			}),
		});

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error.name).toBe("ZodError");
	});

	it("should handle empty user prompts", async () => {
		const response = await app.request("/multi/completion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemPrompt: "Test prompt",
				providers: ["openai", "gemini"],
			}),
		});

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBeDefined();
	});
});
