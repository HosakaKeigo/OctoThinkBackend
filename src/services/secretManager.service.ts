import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { promises as fs } from "node:fs";
import path from "node:path";

export class secretsManagerService {
	private readonly client: SecretManagerServiceClient;
	private readonly projectId: string;
	private localSecretPath: string;

	constructor(projectId: string) {
		this.client = new SecretManagerServiceClient();
		this.projectId = projectId;
		this.localSecretPath = ".secret.local";
	}

	/**
	 * Read secret from either Secret Manager or local file
	 * Prioritizes local secrets for development if they exist
	 */
	async readSecret(secretName: string): Promise<string | null> {
		try {
			// Try reading from local file first (for development)
			const localSecret = await this.readLocalSecret(secretName);
			if (localSecret !== null) {
				console.log(`[SecretManager] Using local secret for ${secretName}`);
				return localSecret;
			}

			const [secretVersion] = await this.client.accessSecretVersion({
				name: `projects/${this.projectId}/secrets/${secretName}/versions/latest`,
			});
			console.log(
				`[SecretManager] Reading secret ${secretName} from Cloud Secret Manager`,
			);
			return secretVersion.payload?.data?.toString() || null;
		} catch (error) {
			console.error(
				`[SecretManager] Failed to read secret ${secretName}:`,
				error,
			);
			return null;
		}
	}

	/**
	 * Attempt to read secret from local file
	 * Returns null if local file doesn't exist or can't be read
	 */
	private async readLocalSecret(secretName: string): Promise<string | null> {
		try {
			const filePath = path.join(
				process.cwd(),
				this.localSecretPath,
				secretName,
			);
			const content = await fs.readFile(filePath, "utf-8");
			return content.trim();
		} catch (error) {
			return null;
		}
	}
}
