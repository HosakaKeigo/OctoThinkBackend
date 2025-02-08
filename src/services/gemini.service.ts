import {
	type GenerativeModelPreview,
	VertexAI,
	type GenerateContentRequest,
} from "@google-cloud/vertexai";
import type { AIServiceInterface } from "../types.js";
import { getEndpoints } from "../utils/getEndpoints.js";
import type { Secrets } from "../env.js";
import z from "zod";

export class GeminiService implements AIServiceInterface {
	private vertexAI: VertexAI;
	private model: GenerativeModelPreview;

	constructor(env: Secrets) {
		this.validateEnv(env);
		this.vertexAI = new VertexAI({
			project: env.GCLOUD_PROJECT_ID,
			location: env.GCLOUD_LOCATION,
			apiEndpoint: getEndpoints(env).gemini,
		});
		this.model = this.vertexAI.preview.getGenerativeModel({
			model: env.GCLOUD_MODEL,
			generationConfig: {
				maxOutputTokens: 8192,
				temperature: 0,
			},
			safetySettings: [],
		});
	}

	async completion(
		systemPrompt: string,
		userPrompts: string[],
		responseSchema?: Record<string, unknown>,
	): Promise<string> {
		const req: GenerateContentRequest = {
			contents: [
				{
					role: "USER",
					parts: userPrompts.map((prompt) => ({ text: prompt })),
				},
			],
			systemInstruction: systemPrompt,
		};
		if (responseSchema) {
			req.generationConfig = {
				responseMimeType: "application/json",
				responseSchema: responseSchema,
			};
		}

		const { response } = await this.model.generateContent(req);
		const candidates = response.candidates;
		if (!candidates || candidates.length === 0) {
			throw new Error("No completion candidates found");
		}
		return candidates[0].content.parts[0].text ?? "";
	}

	private validateEnv(env: Secrets) {
		const GEMINI_ENV_SCHEMA = z.object({
			GCLOUD_PROJECT_ID: z.string(),
			GCLOUD_LOCATION: z.string(),
			GCLOUD_MODEL: z.string(),
		});
		const validatedEnv = GEMINI_ENV_SCHEMA.safeParse(env);
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
