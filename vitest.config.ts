import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			GCLOUD_PROJECT_ID: "test-project",
			SECRET_NAME: "test-secret",
			MAX_INPUT_LENGTH: "1000",
		},
		unstubEnvs: true,
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: "html",
		},
		environment: "node",
		clearMocks: true,
	},
});
