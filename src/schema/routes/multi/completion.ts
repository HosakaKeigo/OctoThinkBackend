import { createRoute, z } from "@hono/zod-openapi";
import { RequestSchema } from "../../interface/request.js";
import { ResponseSchema } from "../../interface/response.js";

const Provider = z.enum(["openai", "gemini"]);
export type Provider = z.infer<typeof Provider>;

const MultiRequestSchema = RequestSchema.extend({
	providers: z.array(Provider),
});

const MultiResponseSchema = z.object({
	systemPrompt: z.string(),
	userPrompts: z.array(z.string()),
	completions: z.array(
		ResponseSchema.extend({
			providers: z.array(Provider),
		}),
	),
});

export const MultiCompletionRoute = createRoute({
	method: "post",
	operationId: "multiCompletion",
	summary: "request completion from multiple providers",
	path: "/multi/completion",
	request: {
		body: {
			content: {
				"application/json": {
					schema: MultiRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: MultiResponseSchema,
				},
			},
			description: "Successful completion from multiple providers",
		},
		400: {
			description: "Invalid request",
		},
	},
});
