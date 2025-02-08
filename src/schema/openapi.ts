import { z } from "zod";

const OpenAPIType = z.enum([
	"string",
	"number",
	"integer",
	"boolean",
	"array",
	"object",
]);

type OpenAPIPropertyType = z.ZodObject<{
	type: z.ZodEnum<
		["string", "number", "integer", "boolean", "array", "object"]
	>;
	description: z.ZodOptional<z.ZodString>;
	example: z.ZodOptional<z.ZodAny>;
	// biome-ignore lint/suspicious/noExplicitAny: <difficult...>
	items: z.ZodOptional<z.ZodLazy<any>>;
	// biome-ignore lint/suspicious/noExplicitAny: <difficult...>
	properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<any>>>;
	required: z.ZodOptional<z.ZodArray<z.ZodString>>;
}>;

const OpenAPIProperty: OpenAPIPropertyType = z.object({
	type: OpenAPIType,
	description: z.string().optional(),
	example: z.any().optional(),
	items: z.lazy(() => OpenAPIProperty).optional(), // array用
	properties: z.record(z.lazy(() => OpenAPIProperty)).optional(), // object用
	required: z.array(z.string()).optional(),
});

const OpenAPISchema = z.object({
	type: z.literal("object"),
	properties: z.record(OpenAPIProperty),
	required: z.array(z.string()).optional(),
});

export type OpenAPISchemaType = z.infer<typeof OpenAPISchema>;
export function validateOpenAPISchema(schema: unknown): OpenAPISchemaType {
	try {
		return OpenAPISchema.parse(schema);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues
				.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
				.join("\n");
			throw new z.ZodError([
				{
					code: z.ZodIssueCode.custom,
					path: ["responseSchema"],
					message: `Invalid OpenAPI Schema:\n${issues}`,
				},
			]);
		}
		throw error;
	}
}
