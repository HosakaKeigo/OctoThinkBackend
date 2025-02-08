import { localEnv } from "../env.js";

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

export function validatePrompts(userPrompts: string[]): void {
	const totalLength = userPrompts.reduce(
		(sum, prompt) => sum + prompt.length,
		0,
	);
	if (totalLength > localEnv.MAX_INPUT_LENGTH) {
		throw new ValidationError(
			`Total prompt length exceeds maximum limit of ${localEnv.MAX_INPUT_LENGTH} characters`,
		);
	}
}

export function handleError(e: unknown): { error: string; status: 400 } {
	console.error(e);

	if (e instanceof ValidationError) {
		return {
			error: e.message,
			status: 400,
		};
	}

	return {
		error: e instanceof Error ? e.message : String(e),
		status: 400,
	};
}
