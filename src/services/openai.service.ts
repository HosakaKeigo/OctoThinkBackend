import type OpenAI from "openai";
import { AzureOpenAI } from "openai";
import type { AIServiceInterface } from "../types.js";
import { getEndpoints } from "../utils/getEndpoints.js";
import type { Secrets } from "../env.js";
import z from "zod";

export class OpenAIService implements AIServiceInterface {
	private readonly openai: AzureOpenAI;
	private readonly model: string;

	constructor(env: Secrets) {
		const validatedEnv = this.validateEnv(env);
		this.openai = new AzureOpenAI({
			apiKey: validatedEnv.OPENAI_API_KEY,
			baseURL: getEndpoints(env).azureOpenAI,
			apiVersion: validatedEnv.AZURE_OPENAI_API_VERSION,
		});
		this.model = validatedEnv.OPENAI_MODEL;
	}

	async completion(
		systemPrompt: string,
		userPrompts: string[],
		responseSchema?: Record<string, unknown>,
	): Promise<string> {
		const messages: (
			| OpenAI.ChatCompletionUserMessageParam
			| OpenAI.ChatCompletionSystemMessageParam
		)[] = [
			{ role: "system", content: systemPrompt },
			...userPrompts.map((prompt) => ({
				role: "user" as const,
				content: prompt,
			})),
		];

		const options: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
			{
				model: this.model,
				messages: messages,
			};

		// Structured Output
		if (responseSchema) {
			options.response_format = {
				type: "json_schema",
				json_schema: {
					name: "response",
					schema: responseSchema,
				},
			};
		}

		const response = await this.openai.chat.completions.create(options);
		return response.choices[0]?.message?.content ?? "";
	}

	private validateEnv(env: Secrets) {
		const OPENAI_ENV_SCHEMA = z.object({
			OPENAI_API_KEY: z.string(),
			AZURE_OPENAI_RESOURCE_NAME: z.string(),
			AZURE_OPENAI_API_VERSION: z.string(),
			OPENAI_MODEL: z.string(),
		});
		const validatedEnv = OPENAI_ENV_SCHEMA.safeParse(env);
		if (validatedEnv.success === false) {
			const missingEnvVars = validatedEnv.error.issues.map((e) =>
				e.path.join("."),
			);
			throw new Error(
				`Missing or invalid environment variables: ${missingEnvVars.join(", ")}`,
			);
		}
		return validatedEnv.data;
	}
}
