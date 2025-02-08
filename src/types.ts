import type { Secrets } from "./env.js";

export type HonoApp = {
	Variables: {
		SECRETS: Secrets;
	};
};

export type Message = {
	role: "system" | "user";
	content: string;
};

export interface AIServiceInterface {
	completion(
		systemPrompt: string,
		userPrompts: string[],
		responseSchema: Record<string, unknown>,
	): Promise<string>;
}
