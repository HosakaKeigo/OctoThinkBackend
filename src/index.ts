import { OpenAPIHono } from "@hono/zod-openapi";
import { completionAPI as openAICompletionAPI } from "./routes/openai/completion.js";
import { completionAPI as geminiCompletionAPI } from "./routes/gemini/completion.js";
import { completionAPI as claudeCompletionAPI } from "./routes/claude/completion.js";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { swaggerUI } from "@hono/swagger-ui";
import { serve } from "@hono/node-server";
import type { HonoApp } from "./types.js";
import { multiCompletionAPI } from "./routes/multi/completion.js";
import { fetchSecret } from "./env.js";

const app = new OpenAPIHono<HonoApp>();

// ==== Middleware =====
app.use(logger());
app.use(secureHeaders());

// ==== Set up secrets =====
const secretJson = await fetchSecret();

app.use(async (c, next) => {
	if (!c.get("SECRETS")) {
		c.set("SECRETS", secretJson);
	}
	await next();
});

// ==== Register routes ====
openAICompletionAPI(app);
geminiCompletionAPI(app);
// Vertex AIでのQuotaがないため、2024/12現在使えない
// claudeCompletionAPI(app)

multiCompletionAPI(app);

// ==== Error handling ====
app.onError((err, c) => {
	console.error(err);
	return c.json({ error: err.message }, 500);
});

// ==== Swagger UI =====
app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Multi LLM",
	},
});
app.get("/ui", swaggerUI({ url: "/doc" }));

// ==== Start server ====
const port = 8080;
console.log(`Server is running on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
