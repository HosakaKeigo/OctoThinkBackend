import type { OpenAPIHono } from "@hono/zod-openapi";
import type { HonoApp } from "../../types.js";
import {
	MultiCompletionRoute,
	type Provider,
} from "../../schema/routes/multi/completion.js";
import { OpenAIService } from "../../services/openai.service.js";
import { GeminiService } from "../../services/gemini.service.js";
import { validatePrompts, handleError } from "../../utils/validation.js";
import {
	handleProviderError,
	formatCompletionResult,
} from "../../utils/errorHandler.js";
import type { Secrets } from "../../env.js";

interface ProviderConfig {
	provider: Provider;
	service: OpenAIService | GeminiService;
}

/**
 * If the provider is valid, initialize the corresponding LLM service
 *
 * If required environment variables are missing, or the provider is unknown, return null
 */
function initLLM(provider: Provider, secrets: Secrets) {
	try {
		switch (provider) {
			case "openai":
				return new OpenAIService(secrets);
			case "gemini":
				return new GeminiService(secrets);
			default:
				console.warn(`[initLLM] Unknown provider: ${provider}`);
				return null;
		}
	} catch (error) {
		if (error instanceof Error) {
			console.warn(
				`[initLLM] Failed to initialize ${provider}, ${error.message}`,
			);
		}
		return null;
	}
}

export const multiCompletionAPI = (app: OpenAPIHono<HonoApp>) => {
	app.openapi(MultiCompletionRoute, async (c) => {
		try {
			const { systemPrompt, userPrompts, providers } = c.req.valid("json");
			validatePrompts(userPrompts);

			console.log(`[multi/completion] Starting completion request:
        System Prompt: ${systemPrompt}
        User Prompts: ${JSON.stringify(userPrompts)}
        Providers: ${providers.join(", ")}`);

			const secrets = c.get("SECRETS");
			const services = providers
				.map((provider) => ({
					provider,
					service: initLLM(provider, secrets),
				}))
				.filter((llm): llm is ProviderConfig => llm.service !== null);

			if (services.length === 0) {
				throw new Error("No valid LLM services available. Check your secret.");
			}

			const results = await Promise.allSettled(
				services.map(async ({ provider, service }) => {
					console.log(`[multi/completion] Starting ${provider} request`);

					try {
						const completion = await service.completion(
							systemPrompt,
							userPrompts,
						);
						return { completion, provider };
					} catch (e) {
						throw handleProviderError(e, provider);
					}
				}),
			);

			const completions = results.map(formatCompletionResult);
			const response = { systemPrompt, userPrompts, completions };

			console.log(
				"[multi/completion] Completed all requests. Response:",
				response,
			);
			return c.json(response);
		} catch (e) {
			const { error, status } = handleError(e);
			return c.json({ error }, status);
		}
	});
};
