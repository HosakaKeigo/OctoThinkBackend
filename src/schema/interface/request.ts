import { z } from "@hono/zod-openapi";
import { type OpenAPISchemaType, validateOpenAPISchema } from "../openapi.js";

const OpenAPISchemaValidator = z.custom<OpenAPISchemaType>(
	(data): data is OpenAPISchemaType => {
		try {
			validateOpenAPISchema(data);
			return true;
		} catch {
			return false;
		}
	},
	{
		message: "Invalid OpenAPI Schema",
	},
);

export const RequestSchema = z
	.object({
		systemPrompt: z.string(),
		userPrompts: z.array(z.string()),
		/**
		 * Accepts an optional OpenAPI schema for the response.
		 */
		responseSchema: OpenAPISchemaValidator.optional().superRefine(
			(val, ctx) => {
				try {
					validateOpenAPISchema(val);
				} catch (e) {
					if (e instanceof z.ZodError) {
						// biome-ignore lint/complexity/noForEach: <explanation>
						e.issues.forEach((issue) => {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: issue.message,
								path: issue.path,
							});
						});
					} else {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: e instanceof Error ? e.message : "Invalid schema",
						});
					}
				}
			},
		),
	})
	.partial({
		responseSchema: true,
	});
