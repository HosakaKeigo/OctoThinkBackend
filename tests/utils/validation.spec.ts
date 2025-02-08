import { describe, it, expect } from "vitest";
import {
	ValidationError,
	validatePrompts,
	handleError,
} from "../../src/utils/validation.js";
import { localEnv } from "../../src/env.js";

describe("ValidationError", () => {
	it("creates error with correct name and message", () => {
		const error = new ValidationError("test message");
		expect(error.name).toBe("ValidationError");
		expect(error.message).toBe("test message");
	});
});

describe("validatePrompts", () => {
	it("accepts prompts within length limit", () => {
		const prompts = ["short prompt", "another short prompt"];
		expect(() => validatePrompts(prompts)).not.toThrow();
	});

	it("throws error when prompts exceed length limit", () => {
		const longPrompt = "a".repeat(localEnv.MAX_INPUT_LENGTH + 1);
		expect(() => validatePrompts([longPrompt])).toThrow(ValidationError);
		expect(() => validatePrompts([longPrompt])).toThrow(
			`Total prompt length exceeds maximum limit of ${localEnv.MAX_INPUT_LENGTH} characters`,
		);
	});
});

describe("handleError", () => {
	it("handles ValidationError", () => {
		const error = new ValidationError("validation failed");
		expect(handleError(error)).toEqual({
			error: "validation failed",
			status: 400,
		});
	});

	it("handles Error instance", () => {
		const error = new Error("general error");
		expect(handleError(error)).toEqual({
			error: "general error",
			status: 400,
		});
	});

	it("handles non-Error objects", () => {
		expect(handleError("string error")).toEqual({
			error: "string error",
			status: 400,
		});
	});
});
