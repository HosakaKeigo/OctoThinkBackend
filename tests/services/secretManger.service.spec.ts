import {
	describe,
	expect,
	it,
	vi,
	beforeEach,
	type MockInstance,
} from "vitest";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { promises as fs } from "node:fs";
import path from "node:path";
import { secretsManagerService } from "../../src/services/secretManager.service.js";

vi.mock("node:fs", () => ({
	promises: {
		readFile: vi.fn(),
	},
}));

vi.mock("node:path", () => ({
	default: {
		join: vi.fn((...args) => args.join("/")),
	},
}));

describe("secretsManagerService", () => {
	let service: secretsManagerService;
	const mockProjectId = "test-project";
	const mockSecretName = "test-secret";
	let mockAccessSecretVersion: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		mockAccessSecretVersion = vi.spyOn(
			SecretManagerServiceClient.prototype,
			"accessSecretVersion",
		);
		service = new secretsManagerService(mockProjectId);
	});

	describe("readSecret", () => {
		describe("Local secrets", () => {
			it("should read secret from local file when available", async () => {
				const mockLocalSecret = "local-secret-value";
				vi.mocked(fs.readFile).mockResolvedValueOnce(mockLocalSecret);
				vi.mocked(path.join).mockReturnValueOnce(
					"/mock/path/.secret.local/test-secret",
				);

				const result = await service.readSecret(mockSecretName);

				expect(result).toBe(mockLocalSecret);
				expect(fs.readFile).toHaveBeenCalledWith(
					"/mock/path/.secret.local/test-secret",
					"utf-8",
				);
				expect(
					SecretManagerServiceClient.prototype.accessSecretVersion,
				).not.toHaveBeenCalled();
			});

			it("should fall back to Secret Manager when local file is not found", async () => {
				const mockCloudSecret = "cloud-secret-value";
				vi.mocked(fs.readFile).mockRejectedValueOnce(
					new Error("File not found"),
				);
				mockAccessSecretVersion.mockResolvedValueOnce([
					{
						payload: {
							data: Buffer.from(mockCloudSecret),
						},
					},
				]);

				const result = await service.readSecret(mockSecretName);

				expect(result).toBe(mockCloudSecret);
				expect(fs.readFile).toHaveBeenCalled();
				expect(
					SecretManagerServiceClient.prototype.accessSecretVersion,
				).toHaveBeenCalled();
				expect(
					SecretManagerServiceClient.prototype.accessSecretVersion,
				).toHaveBeenCalledWith({
					name: `projects/${mockProjectId}/secrets/${mockSecretName}/versions/latest`,
				});
			});

			it("should return null when secret does not exist in Secret Manager", async () => {
				vi.mocked(fs.readFile).mockRejectedValueOnce(
					new Error("File not found"),
				);
				mockAccessSecretVersion.mockResolvedValueOnce([{ payload: null }]);

				const result = await service.readSecret(mockSecretName);

				expect(result).toBeNull();
			});

			it("should return null when Secret Manager throws an error", async () => {
				vi.mocked(fs.readFile).mockRejectedValueOnce(
					new Error("File not found"),
				);
				mockAccessSecretVersion.mockRejectedValueOnce(
					new Error("Secret Manager error"),
				);

				const result = await service.readSecret(mockSecretName);

				expect(result).toBeNull();
			});
		});
	});
});
