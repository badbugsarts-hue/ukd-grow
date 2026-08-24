import { type ChangeEvent, useState } from "react";
import { preparePrivateImage } from "./media";
import { applyRunCommand } from "./run-commands";
import {
  getOrCreateWorkspaceMediaKey,
  saveEncryptedMedia,
} from "./run-storage";
import type { ExperienceLens, RunPackage } from "./types";

export function MediaWorkspace({
  run,
  lens,
  onChange,
}: {
  run: RunPackage;
  lens: ExperienceLens;
  onChange: (run: RunPackage) => void;
}) {
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const importImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const key = await getOrCreateWorkspaceMediaKey();
      const prepared = await preparePrivateImage(
        file,
        run,
        "plant",
        run.plants[0]?.id ?? "run",
        caption,
        key,
      );
      const {
        id: _id,
        runId: _runId,
        revision: _revision,
        ...asset
      } = prepared.asset;
      const result = applyRunCommand(run, {
        kind: "media.attach",
        asset: { ...asset, id: prepared.asset.id },
      });
      if (!result.ok)
        throw new Error(result.errors.map((entry) => entry.message).join(" "));
      await saveEncryptedMedia(prepared.asset.id, prepared.ciphertext);
      onChange(result.value);
      setCaption("");
      setMessage(
        "✓ Orientiert, als WebP neu codiert, EXIF entfernt, gehasht und AES-GCM-verschlüsselt.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Medienimport fehlgeschlagen.",
      );
    }
  };
  return (
    <div className="page-stack">
      <section className="workspace-banner">
        <div>
          <small>PRIVATE MEDIA · {lens.toUpperCase()}</small>
          <h2>Medien</h2>
          <p>
            Originale werden nicht dauerhaft gespeichert. Importierte Bilder
            werden normalisiert, von Metadaten bereinigt und lokal
            verschlüsselt.
          </p>
        </div>
      </section>
      <section className="panel form-panel">
        <div className="form-grid">
          <label>
            <span>Bildbeschreibung</span>
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>
          <label>
            <span>Bild auswählen</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void importImage(event)}
            />
          </label>
        </div>
        {message && (
          <p
            className={message.startsWith("✓") ? "save-state" : "inline-error"}
          >
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <header>
          <div>
            <small>ENCRYPTED LOCAL STORE</small>
            <h2>Medienreferenzen</h2>
          </div>
        </header>
        <div className="record-list">
          {run.mediaAssets.length === 0 ? (
            <p>Noch keine Medien.</p>
          ) : (
            run.mediaAssets.map((asset) => (
              <article className="record-card" key={asset.id}>
                <div>
                  <small>
                    {asset.privacyStatus} · {asset.encryption.algorithm}
                  </small>
                  <h3>{asset.caption || "Ohne Beschreibung"}</h3>
                  <p>
                    {asset.width} × {asset.height} ·{" "}
                    {(asset.byteLength / 1024).toFixed(1)} KiB · SHA{" "}
                    {asset.sha256.slice(0, 12)}…
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
