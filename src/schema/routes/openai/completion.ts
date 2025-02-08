import { createRoute } from "@hono/zod-openapi";
import { RequestSchema } from "../../interface/request.js";
import { ResponseSchema } from "../../interface/response.js";

export const CompletionRoute = createRoute({
	method: "post",
	operationId: "openAICompletion",
	summary: "request completion from openai",
	path: "/openai/completion",
	request: {
		body: {
			content: {
				"application/json": {
					schema: RequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: ResponseSchema,
				},
			},
			description: "Successful completion",
		},
		400: {
			description: "Invalid request",
		},
	},
});
