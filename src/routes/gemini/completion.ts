import type { OpenAPIHono } from "@hono/zod-openapi";
import type { HonoApp } from "../../types.js";
import { CompletionRoute } from "../../schema/routes/gemini/completion.js";
import { GeminiService } from "../../services/gemini.service.js";
import { validatePrompts } from "../../utils/validation.js";

export const completionAPI = (app: OpenAPIHono<HonoApp>) => {
	app.openapi(CompletionRoute, async (c) => {
		try {
			const { systemPrompt, userPrompts, responseSchema } = c.req.valid("json");
			validatePrompts(userPrompts);

			const gemini = new GeminiService(c.get("SECRETS"));
			const completion = await gemini.completion(
				systemPrompt,
				userPrompts,
				responseSchema,
			);

			return c.json({ completion });
		} catch (e) {
			console.error(e);
			return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
		}
	});
};
