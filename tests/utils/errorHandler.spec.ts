import { describe, it, expect } from "vitest";
import {
	handleProviderError,
	formatCompletionResult,
} from "../../src/utils/errorHandler.js";
import type { Provider } from "../../src/schema/routes/multi/completion.js";

describe("handleProviderError", () => {
	const provider: Provider = "openai";

	it("handles ValidationError", () => {
		const error = new Error("validation failed");
		error.name = "ValidationError";

		const result = handleProviderError(error, provider);
		expect(result).toEqual({
			code: "VALIDATION_ERROR",
			message: "validation failed",
			provider,
		});
	});

	it("handles RateLimitError", () => {
		const error = new Error("rate limit exceeded");
		error.name = "RateLimitError";

		const result = handleProviderError(error, provider);
		expect(result).toEqual({
			code: "RATE_LIMIT_ERROR",
			message: "rate limit exceeded",
			provider,
		});
	});

	it("handles unknown error", () => {
		const error = "unknown error";
		const result = handleProviderError(error, provider);
		expect(result).toEqual({
			code: "UNKNOWN_ERROR",
			message: "unknown error",
			provider,
		});
	});
});

describe("formatCompletionResult", () => {
	it("returns successful completion result", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const successResult: PromiseSettledResult<any> = {
			status: "fulfilled",
			value: {
				completion: "success",
				provider: "openai",
			},
		};

		const result = formatCompletionResult(successResult);
		expect(result).toEqual({
			completion: "success",
			provider: "openai",
		});
	});

	it("formats error result", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const errorResult: PromiseSettledResult<any> = {
			status: "rejected",
			reason: {
				code: "TEST_ERROR",
				message: "test error",
				provider: "openai",
			},
		};

		const result = formatCompletionResult(errorResult);
		expect(result).toEqual({
			completion: "Error [TEST_ERROR]: test error",
			provider: "openai",
		});
	});
});
