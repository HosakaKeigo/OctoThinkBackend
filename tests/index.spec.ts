import { describe, it, vi, expect, beforeEach } from "vitest";
import { completionAPI as openAICompletionAPI } from "../src/routes/openai/completion.js";
import { HTTPException } from "hono/http-exception";

vi.mock("../src/env.js");
vi.mock("../src/routes/openai/completion.js");
vi.mock("@hono/node-server");

describe("entrypoint", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	describe("Swagger UI", () => {
		describe("GET /ui", () => {
			it("should return 200", async () => {
				const { default: app } = await import("../src/index.js");
				const response = await app.request("/ui");
				expect(response.status).toBe(200);
			});
		});

		describe("GET /doc", () => {
			it("should return 200", async () => {
				const { default: app } = await import("../src/index.js");
				const response = await app.request("/doc");
				expect(response.status).toBe(200);
			});
		});
	});

	describe("Error handler", () => {
		it("handle secret fetch error", async () => {
			vi.mocked(openAICompletionAPI).mockImplementationOnce((app) => {
				app.post("/openai/completion", async (c) => {
					throw new HTTPException(400, { message: "OpenAI completion" });
				});
			});
			const { default: app } = await import("../src/index.js");
			const response = await app.request("/openai/completion", {
				method: "POST",
				body: JSON.stringify({}),
			});
			expect(response.status).toBe(500);
		});
	});
});
