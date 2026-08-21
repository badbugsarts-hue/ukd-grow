import type { MediaAsset, RunPackage } from "./types";

export interface PreparedMedia {
	asset: MediaAsset;
	ciphertext: ArrayBuffer;
}

export async function preparePrivateImage(
	file: File,
	run: RunPackage,
	entityType: MediaAsset["entityType"],
	entityId: string,
	caption: string,
	key: CryptoKey,
): Promise<PreparedMedia> {
	if (!file.type.startsWith("image/"))
		throw new Error("Nur Bilddateien werden akzeptiert.");
	if (file.size > 25 * 1024 * 1024)
		throw new Error("Bild ist größer als 25 MiB.");
	const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
	try {
		const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Bildverarbeitung ist nicht verfügbar.");
		context.drawImage(bitmap, 0, 0, width, height);
		const normalized = await canvasBlob(canvas, "image/webp", 0.9);
		const plaintext = await normalized.arrayBuffer();
		const sha256 = await digestHex(plaintext);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const ciphertext = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			key,
			plaintext,
		);
		return {
			asset: {
				id: crypto.randomUUID(),
				runId: run.id,
				createdAt: new Date().toISOString(),
				sha256,
				mimeType: "image/webp",
				width,
				height,
				byteLength: normalized.size,
				privacyStatus: "exif-stripped",
				encryption: {
					algorithm: "AES-GCM",
					keyId: "workspace-media-key-v1",
					iv: toBase64(iv),
				},
				entityType,
				entityId,
				caption,
				revision: 1,
			},
			ciphertext,
		};
	} finally {
		bitmap.close();
	}
}

export async function decryptPrivateImage(
	asset: MediaAsset,
	ciphertext: ArrayBuffer,
	key: CryptoKey,
): Promise<Blob> {
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromBase64(asset.encryption.iv) },
		key,
		ciphertext,
	);
	if ((await digestHex(plaintext)) !== asset.sha256)
		throw new Error("Medien-Prüfsumme stimmt nach Entschlüsselung nicht.");
	return new Blob([plaintext], { type: asset.mimeType });
}

function canvasBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("Bild-Re-Encoding fehlgeschlagen."))),
			type,
			quality,
		),
	);
}

async function digestHex(buffer: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", buffer);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase();
}

function toBase64(value: Uint8Array): string {
	return btoa(String.fromCharCode(...value));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
	const decoded = atob(value);
	const buffer = new ArrayBuffer(decoded.length);
	const bytes = new Uint8Array(buffer);
	for (let index = 0; index < decoded.length; index += 1)
		bytes[index] = decoded.charCodeAt(index);
	return bytes;
}
