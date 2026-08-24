import type React from "react";
import { useEffect } from "react";
import type { AutoflowerStrain, ExperienceLens, RunPackage } from "../../types";
import { AutoflowerCockpitPanel } from "../panels/AutoflowerCockpitPanel";

export interface AutoflowerCockpitModalProps {
  onClose: () => void;
  onSelectStrain: (strain: AutoflowerStrain) => void;
  selectedStrainIds?: string[];
  lens?: ExperienceLens;
  run?: RunPackage;
}

export const AutoflowerCockpitModal: React.FC<AutoflowerCockpitModalProps> = ({
  onClose,
  onSelectStrain,
  selectedStrainIds,
  lens = "guided",
}) => {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSelect = (strain: AutoflowerStrain) => {
    onSelectStrain(strain);
    onClose();
  };

  return (
    <div
      className="palette-backdrop autoflower-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="autoflower-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7, 17, 15, 0.82)",
        backdropFilter: "blur(6px)",
        zIndex: 85,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "min(3vh, 24px) 12px",
        overflowY: "auto",
      }}
    >
      <div
        className="autoflower-modal-window"
        style={{
          width: "min(1280px, 98vw)",
          maxHeight: "94vh",
          background: "var(--surface-0)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          margin: "auto 0",
        }}
      >
        {/* Modal Topbar Header */}
        <div
          style={{
            padding: "16px 24px",
            background: "var(--surface-1)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                color: "var(--green)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                marginBottom: "2px",
              }}
            >
              Masterclass Sorten-Auswahl
            </div>
            <h2
              id="autoflower-modal-title"
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              🌱 Autoflower & Genetics Cockpit — Sorte für Setup auswählen
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              minHeight: "44px",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: "20px 24px 40px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          <AutoflowerCockpitPanel
            lens={lens}
            onSelectStrain={handleSelect}
            selectedStrainIds={selectedStrainIds}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
};

export default AutoflowerCockpitModal;
