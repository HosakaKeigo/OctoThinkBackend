import { createRoute } from "@hono/zod-openapi";
import { RequestSchema } from "../../interface/request.js";
import { ResponseSchema } from "../../interface/response.js";

export const CompletionRoute = createRoute({
	method: "post",
	operationId: "claudeCompletion",
	summary: "request completion from claude",
	path: "/claude/completion",
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
