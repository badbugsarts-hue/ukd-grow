import { stableStringify } from "./backup";
import { validateRunPackage } from "./run-state";
import type { RunPackage, WorkspacePackage } from "./types";

export interface WorkspaceBackupEntry {
	path: string;
	sha256: string;
	byteLength: number;
	kind: "workspace" | "run" | "media";
}

export interface WorkspaceBackupV2 {
	format: "ukd-workspace-backup/2";
	createdAt: string;
	workspaceId: string;
	manifest: WorkspaceBackupEntry[];
	files: Record<string, string>;
}

export interface MediaBackupInput {
	assetId: string;
	ciphertext: ArrayBuffer;
}

export interface RecoveryKit {
	format: "ukd-media-recovery-kit/1";
	kdf: "PBKDF2-SHA-256";
	kdfIterations: number;
	salt: string;
	iv: string;
	wrappedKey: string;
	keySha256: string;
}

export async function createWorkspaceBackupV2(
	workspace: WorkspacePackage,
	runs: RunPackage[],
	media: MediaBackupInput[] = [],
	now = new Date(),
): Promise<WorkspaceBackupV2> {
	const files: Record<string, string> = {};
	files["workspace.json"] = utf8ToBase64(stableStringify(workspace));
	for (const run of runs)
		files[`runs/${run.id}.json`] = utf8ToBase64(stableStringify(run));
	for (const entry of media)
		files[`media/${entry.assetId}.bin`] = bytesToBase64(
			new Uint8Array(entry.ciphertext),
		);
	const manifest: WorkspaceBackupEntry[] = [];
	for (const [path, encoded] of Object.entries(files)) {
		const bytes = base64ToBytes(encoded);
		manifest.push({
			path,
			sha256: await sha256(bytes.buffer),
			byteLength: bytes.byteLength,
			kind: path === "workspace.json" ? "workspace" : path.startsWith("runs/") ? "run" : "media",
		});
	}
	return {
		format: "ukd-workspace-backup/2",
		createdAt: now.toISOString(),
		workspaceId: workspace.id,
		manifest: manifest.sort((left, right) => left.path.localeCompare(right.path)),
		files,
	};
}

export async function validateWorkspaceBackupV2(value: unknown): Promise<
	| { ok: true; workspace: WorkspacePackage; runs: RunPackage[]; media: MediaBackupInput[] }
	| { ok: false; errors: string[] }
> {
	if (!isBackup(value)) return { ok: false, errors: ["Workspace-Backup-v2-Format fehlt."] };
	const errors: string[] = [];
	const manifestPaths = new Set(value.manifest.map((entry) => entry.path));
	if (manifestPaths.size !== value.manifest.length) errors.push("Manifest enthält doppelte Pfade.");
	for (const entry of value.manifest) {
		const encoded = value.files[entry.path];
		if (!encoded) { errors.push(`${entry.path}: Datei fehlt.`); continue; }
		const bytes = base64ToBytes(encoded);
		if (bytes.byteLength !== entry.byteLength) errors.push(`${entry.path}: Dateigröße stimmt nicht.`);
		if ((await sha256(bytes.buffer)) !== entry.sha256) errors.push(`${entry.path}: SHA-256 stimmt nicht.`);
	}
	for (const path of Object.keys(value.files))
		if (!manifestPaths.has(path)) errors.push(`${path}: Datei ist nicht manifestiert.`);
	const workspaceFile = value.files["workspace.json"];
	if (!workspaceFile) errors.push("workspace.json fehlt.");
	if (errors.length || !workspaceFile) return { ok: false, errors };
	let workspace: WorkspacePackage;
	try {
		workspace = JSON.parse(base64ToUtf8(workspaceFile)) as WorkspacePackage;
	} catch {
		return { ok: false, errors: ["workspace.json ist nicht lesbar."] };
	}
	if (workspace.format !== "ukd-workspace-package" || workspace.id !== value.workspaceId)
		return { ok: false, errors: ["Workspace-Identität oder Schema ist ungültig."] };
	const runs: RunPackage[] = [];
	for (const entry of value.manifest.filter((item) => item.kind === "run")) {
		try {
			const parsed = validateRunPackage(JSON.parse(base64ToUtf8(value.files[entry.path] ?? "")));
			if (!parsed.ok) errors.push(`${entry.path}: ${parsed.errors.join(" ")}`);
			else runs.push(parsed.value);
		} catch { errors.push(`${entry.path}: Run ist nicht lesbar.`); }
	}
	const media = value.manifest
		.filter((entry) => entry.kind === "media")
		.map((entry) => ({ assetId: entry.path.slice(6, -4), ciphertext: base64ToBytes(value.files[entry.path] ?? "").buffer }));
	const assetIds = new Set(runs.flatMap((run) => run.mediaAssets.map((asset) => asset.id)));
	for (const entry of media)
		if (!assetIds.has(entry.assetId)) errors.push(`media/${entry.assetId}: keine fachliche Referenz.`);
	return errors.length ? { ok: false, errors } : { ok: true, workspace, runs, media };
}

export async function createRecoveryKit(
	workspaceKey: CryptoKey,
	passphrase: string,
): Promise<RecoveryKit> {
	if (passphrase.length < 12) throw new Error("Recovery-Passphrase benötigt mindestens 12 Zeichen.");
	const rawKey = await crypto.subtle.exportKey("raw", workspaceKey);
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const iterations = 310_000;
	const wrappingKey = await deriveWrappingKey(passphrase, salt, iterations);
	const wrappedKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, rawKey);
	return {
		format: "ukd-media-recovery-kit/1",
		kdf: "PBKDF2-SHA-256",
		kdfIterations: iterations,
		salt: bytesToBase64(salt),
		iv: bytesToBase64(iv),
		wrappedKey: bytesToBase64(new Uint8Array(wrappedKey)),
		keySha256: await sha256(rawKey),
	};
}

export async function restoreWorkspaceKey(
	kit: RecoveryKit,
	passphrase: string,
): Promise<CryptoKey> {
	const salt = base64ToBytes(kit.salt);
	const iv = base64ToBytes(kit.iv);
	const wrappingKey = await deriveWrappingKey(passphrase, salt, kit.kdfIterations);
	let raw: ArrayBuffer;
	try {
		raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrappingKey, base64ToBytes(kit.wrappedKey));
	} catch { throw new Error("Recovery-Passphrase oder Recovery-Kit ist ungültig."); }
	if ((await sha256(raw)) !== kit.keySha256) throw new Error("Recovery-Key-Prüfsumme stimmt nicht.");
	return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function isBackup(value: unknown): value is WorkspaceBackupV2 {
	return Boolean(value) && typeof value === "object" && (value as WorkspaceBackupV2).format === "ukd-workspace-backup/2" && Array.isArray((value as WorkspaceBackupV2).manifest) && Boolean((value as WorkspaceBackupV2).files);
}

async function sha256(value: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", value);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function utf8ToBase64(value: string): string { return bytesToBase64(new TextEncoder().encode(value)); }
function base64ToUtf8(value: string): string { return new TextDecoder().decode(base64ToBytes(value)); }
function bytesToBase64(value: Uint8Array): string {
	let binary = "";
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
	const binary = atob(value);
	const buffer = new ArrayBuffer(binary.length);
	const bytes = new Uint8Array(buffer);
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
	return bytes;
}
