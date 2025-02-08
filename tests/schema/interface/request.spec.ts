import { it, describe, expect } from "vitest";
import { RequestSchema } from "../../../src/schema/interface/request.js";

describe("RequestSchema", () => {
	it("parse request with systemPrompt and user Prompts", () => {
		const validData = {
			systemPrompt: "system prompt",
			userPrompts: ["hello", "bye"],
		};

		const result = RequestSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("rejects request without systemPrompt", () => {
		const invalidData = {
			userPrompts: ["hello", "bye"],
		};

		const result = RequestSchema.safeParse(invalidData);
		expect(result.success).toBe(false);

		if (!result.success) {
			expect(result.error.issues).toEqual([
				{
					code: "invalid_type",
					expected: "string",
					message: "Required",
					path: ["systemPrompt"],
					received: "undefined",
				},
			]);
		}
	});

	it("rejects request without userPrompts", () => {
		const invalidData = {
			systemPrompt: "system prompt",
		};

		const result = RequestSchema.safeParse(invalidData);
		expect(result.success).toBe(false);

		if (!result.success) {
			expect(result.error.issues).toEqual([
				{
					code: "invalid_type",
					expected: "array",
					message: "Required",
					path: ["userPrompts"],
					received: "undefined",
				},
			]);
		}
	});

	it("rejects request with invalid userPrompts(string)", () => {
		const invalidData = {
			systemPrompt: "system prompt",
			userPrompts: "hello",
		};

		const result = RequestSchema.safeParse(invalidData);
		expect(result.success).toBe(false);

		if (!result.success) {
			expect(result.error.issues).toEqual([
				{
					code: "invalid_type",
					expected: "array",
					message: "Expected array, received string",
					path: ["userPrompts"],
					received: "string",
				},
			]);
		}
	});

	it("accepts request with valid responseSchema", () => {
		const validData = {
			systemPrompt: "test prompt",
			userPrompts: ["hello"],
			responseSchema: {
				type: "object",
				properties: {
					massage: {
						type: "string",
						description: "message",
					},
				},
				required: ["massage"],
			},
		};
		const result = RequestSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("rejects request with invalid responseSchema", () => {
		const invalidData = {
			systemPrompt: "test prompt",
			userPrompts: ["hello"],
			responseSchema: {
				wrongKey: "wrongValue",
			},
		};
		const result = RequestSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});
});
