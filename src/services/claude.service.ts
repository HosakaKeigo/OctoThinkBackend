import type { Secrets } from "../env.js";
import type { AIServiceInterface } from "../types.js";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import z from "zod";

/**
 * [WIP] Due to strict quota on Google Cloud, this service is not yet available.
 */
export class ClaudeService implements AIServiceInterface {
	private vertexAI: AnthropicVertex;
	private readonly model: string;
	private readonly DEFAULT_REGION = "us-east5";

	constructor(env: Secrets) {
		throw new Error("Claude service is not yet available");
		const validatedEnv = this.validateEnv(env);
		this.model = validatedEnv.ANTHROPIC_MODEL;
		this.vertexAI = new AnthropicVertex({
			projectId: validatedEnv.GCLOUD_PROJECT_ID,
			region: this.DEFAULT_REGION,
		});
	}

	async completion(
		systemPrompt: string,
		userPrompts: string[],
		responseSchema?: Record<string, unknown>,
	): Promise<string> {
		// Claude doesn't support response schemas, so we'll include it in the system prompt
		const fullSystemPrompt = responseSchema
			? `${systemPrompt}\nResponse must follow this JSON schema:\n${JSON.stringify(responseSchema, null, 2)}`
			: systemPrompt;

		const messages = userPrompts.map((prompt) => ({
			role: "user",
			content: prompt,
		}));

		try {
			const { content } = await this.vertexAI.messages.create({
				system: fullSystemPrompt,
				messages,
				model: this.model,
			});

			const answer = content[0];
			switch (answer.type) {
				case "text":
					return answer.text;
				case "tool_use":
					throw new Error("Tool use not supported");
				default:
					throw new Error("Unknown response type");
			}
		} catch (error) {
			console.error("Error in Claude completion:", error);
			throw error;
		}
	}

	private validateEnv(env: Secrets) {
		const CLAUDE_ENV_SCHEMA = z.object({
			GCLOUD_PROJECT_ID: z.string(),
			ANTHROPIC_MODEL: z.string(),
		});
		const validatedEnv = CLAUDE_ENV_SCHEMA.safeParse(env);
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
