import { z } from "@hono/zod-openapi";

export const ResponseSchema = z.object({
	completion: z.string(),
});
