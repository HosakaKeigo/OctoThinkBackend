import type { Provider } from "../schema/routes/multi/completion.js";

export type CompletionError = {
	code: string;
	message: string;
	provider: Provider;
};

export type CompletionResult = {
	completion: string;
	provider: Provider;
};

export function handleProviderError(
	e: unknown,
	provider: Provider,
): CompletionError {
	let message: string;
	let code = "UNKNOWN_ERROR";

	if (e instanceof Error) {
		message = e.message;
		if (e.name === "ValidationError") code = "VALIDATION_ERROR";
		if (e.name === "RateLimitError") code = "RATE_LIMIT_ERROR";
	} else {
		message = String(e);
	}

	console.error(`[multi/completion] Error with ${provider}:`, {
		code,
		message,
		originalError: e,
	});

	return {
		code,
		message,
		provider,
	};
}

export function formatCompletionResult(
	result: PromiseSettledResult<CompletionResult>,
): CompletionResult {
	if (result.status === "fulfilled") {
		return result.value;
	}
	const error = result.reason as CompletionError;
	return {
		completion: `Error [${error.code}]: ${error.message}`,
		provider: error.provider,
	};
}
