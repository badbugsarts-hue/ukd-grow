import React, {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ExperienceLens } from "../../types";
import {
  type PredictionContext,
  type PredictionSuggestion,
  getLiveFieldSuggestions,
} from "../../prediction-engine";

export interface InlineEditableProps<T = string | number> {
  value: T | null | undefined;
  displayValue?: ReactNode;
  label: string;
  unit?: string;
  fieldKey?: string;
  context?: PredictionContext;
  type?: "text" | "number" | "select" | "date";
  step?: number | string;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: Array<{ label: string; value: T }>;
  getSuggestions?: (
    query: string,
  ) => PredictionSuggestion<T>[] | Promise<PredictionSuggestion<T>[]>;
  validator?: (
    val: T,
  ) => boolean | string | { valid: boolean; error?: string; warning?: string };
  onSave: (
    newValue: T,
    meta?: { reason?: string; isOverride?: boolean },
  ) => void | Promise<void>;
  minTouchTarget?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  tone?: "neutral" | "blue" | "amber" | "green" | "danger" | "purple";
  isOverrideMode?: boolean;
  lens?: ExperienceLens;
}

export function InlineEditable<T extends string | number = string | number>({
  value,
  displayValue,
  label,
  unit,
  fieldKey,
  context,
  type = "text",
  step,
  min,
  max,
  placeholder,
  options,
  getSuggestions,
  validator,
  onSave,
  minTouchTarget = true,
  disabled = false,
  readOnly = false,
  className = "",
  style = {},
  tone = "neutral",
  isOverrideMode = false,
}: InlineEditableProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState<string>(
    value === null || value === undefined ? "" : String(value),
  );
  const [suggestions, setSuggestions] = useState<PredictionSuggestion<T>[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSavedFlash, setIsSavedFlash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Sync draft value whenever external value changes
  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value === null || value === undefined ? "" : String(value));
    } else {
      inputRef.current?.focus();
    }
  }, [value, isEditing]);

  // Query live suggestions
  const fetchSuggestions = (query: string) => {
    if (getSuggestions) {
      const result = getSuggestions(query);
      if (result instanceof Promise) {
        result.then((res) => {
          setSuggestions(res);
          setShowSuggestions(res.length > 0);
        });
      } else {
        setSuggestions(result);
        setShowSuggestions(result.length > 0);
      }
      return;
    }

    if (fieldKey) {
      const engineSuggestions = getLiveFieldSuggestions(
        fieldKey,
        query,
        context,
      ) as unknown as PredictionSuggestion<T>[];
      setSuggestions(engineSuggestions);
      setShowSuggestions(engineSuggestions.length > 0);
    }
  };

  const handleStartEditing = () => {
    if (disabled || readOnly) return;
    setIsEditing(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setHighlightedIndex(-1);
    fetchSuggestions(draftValue);
  };

  const runValidation = (val: T): boolean => {
    if (min !== undefined && typeof val === "number" && val < min) {
      setErrorMessage(`Wert darf nicht kleiner als ${min} sein.`);
      return false;
    }
    if (max !== undefined && typeof val === "number" && val > max) {
      setErrorMessage(`Wert darf nicht größer als ${max} sein.`);
      return false;
    }
    if (validator) {
      const result = validator(val);
      if (typeof result === "boolean") {
        if (!result) {
          setErrorMessage("Ungültiger Eingabewert.");
          return false;
        }
      } else if (typeof result === "string") {
        setErrorMessage(result);
        return false;
      } else if (typeof result === "object" && result !== null) {
        if (!result.valid) {
          setErrorMessage(result.error || "Ungültiger Eingabewert.");
          return false;
        }
        if (result.warning) {
          setWarningMessage(result.warning);
        }
      }
    }
    setErrorMessage(null);
    return true;
  };

  const parseDraft = (): T => {
    if (type === "number") {
      const parsed = Number.parseFloat(draftValue);
      return (Number.isNaN(parsed) ? 0 : parsed) as T;
    }
    return draftValue as T;
  };

  const handleCommit = async (customValue?: T) => {
    const valueToSave = customValue !== undefined ? customValue : parseDraft();
    if (!runValidation(valueToSave)) return;

    try {
      setIsSaving(true);
      await onSave(valueToSave, {
        isOverride: isOverrideMode,
        reason: isOverrideMode ? "Manueller In-Place Override" : undefined,
      });
      setIsEditing(false);
      setShowSuggestions(false);
      setIsSavedFlash(true);
      setTimeout(() => setIsSavedFlash(false), 1500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Fehler beim Speichern.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftValue(value === null || value === undefined ? "" : String(value));
    setIsEditing(false);
    setShowSuggestions(false);
    setErrorMessage(null);
    setWarningMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        showSuggestions &&
        highlightedIndex >= 0 &&
        highlightedIndex < suggestions.length
      ) {
        const selected = suggestions[highlightedIndex];
        if (selected) {
          setDraftValue(String(selected.value));
          handleCommit(selected.value);
        } else {
          handleCommit();
        }
      } else {
        handleCommit();
      }
    } else if (e.key === "ArrowDown") {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      }
    } else if (e.key === "ArrowUp") {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
      }
    } else if (e.key === "Tab") {
      // Commit on tab navigation
      handleCommit();
    }
  };

  const commitRef = useRef(handleCommit);
  commitRef.current = handleCommit;

  // Close suggestions if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (isEditing) {
          commitRef.current();
        }
      }
    };
    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

  // Touch target sizing style
  const touchStyle: CSSProperties = minTouchTarget
    ? { minHeight: "44px", minWidth: "44px" }
    : {};

  if (!isEditing) {
    const display =
      displayValue !== undefined
        ? displayValue
        : value === null || value === undefined || value === ""
          ? "—"
          : `${value}${unit ? ` ${unit}` : ""}`;

    return (
      <div
        ref={containerRef}
        className={`inline-editable inline-editable-view tone-${tone} ${className}`}
        style={{ ...touchStyle, ...style }}
      >
        <button
          type="button"
          className="inline-editable-trigger"
          onClick={handleStartEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStartEditing();
            }
          }}
          disabled={disabled || readOnly}
          aria-label={`${label}: ${display} (Klicken zum Bearbeiten)`}
          style={{
            minHeight: minTouchTarget ? "44px" : undefined,
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            background: "transparent",
            border: "1px dashed transparent",
            borderRadius: "var(--radius-sm, 6px)",
            padding: "4px 8px",
            cursor: disabled || readOnly ? "default" : "pointer",
            color: "inherit",
            textAlign: "left",
          }}
        >
          <span
            className="inline-editable-content"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span className="inline-editable-value">{display}</span>
            {isSavedFlash && (
              <span
                className="inline-editable-badge-success"
                style={{
                  fontSize: "11px",
                  color: "var(--green, #67d6ae)",
                  fontWeight: 600,
                }}
              >
                ✓ Gespeichert
              </span>
            )}
          </span>
          {!disabled && !readOnly && (
            <span
              className="inline-editable-icon"
              aria-hidden="true"
              style={{
                opacity: 0.6,
                fontSize: "13px",
                marginLeft: "auto",
              }}
            >
              ✎
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`inline-editable inline-editable-edit active tone-${tone} ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: "160px",
        ...touchStyle,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minHeight: minTouchTarget ? "44px" : undefined,
        }}
      >
        {type === "select" && options ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={draftValue}
            onChange={(e) => {
              setDraftValue(e.target.value);
              setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            aria-label={`${label} auswählen`}
            style={{
              flex: 1,
              height: "36px",
              padding: "0 8px",
              background: "var(--surface-2, #152521)",
              border: errorMessage
                ? "1px solid var(--red, #ef705c)"
                : "1px solid var(--line-strong, #3b5850)",
              borderRadius: "var(--radius-sm, 6px)",
              color: "var(--text, #eef6f2)",
              fontSize: "14px",
            }}
          >
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            step={step}
            min={min}
            max={max}
            value={draftValue}
            placeholder={placeholder || label}
            onChange={(e) => {
              setDraftValue(e.target.value);
              setErrorMessage(null);
              fetchSuggestions(e.target.value);
            }}
            onFocus={() => fetchSuggestions(draftValue)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            aria-label={`${label} eingeben`}
            style={{
              flex: 1,
              height: "36px",
              padding: "0 10px",
              background: "var(--surface-2, #152521)",
              border: errorMessage
                ? "1px solid var(--red, #ef705c)"
                : "1px solid var(--line-strong, #3b5850)",
              borderRadius: "var(--radius-sm, 6px)",
              color: "var(--text, #eef6f2)",
              fontSize: "14px",
              fontFamily:
                type === "number" ? "var(--font-mono, monospace)" : "inherit",
            }}
          />
        )}

        <button
          type="button"
          onClick={() => handleCommit()}
          disabled={isSaving}
          aria-label="Speichern"
          title="Speichern (Enter)"
          style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--green-dim, #174d3f)",
            border: "1px solid var(--green, #67d6ae)",
            borderRadius: "var(--radius-sm, 6px)",
            color: "var(--green, #67d6ae)",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Abbrechen"
          title="Abbrechen (Esc)"
          style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-1, #101e1b)",
            border: "1px solid var(--line, #29403a)",
            borderRadius: "var(--radius-sm, 6px)",
            color: "var(--text-2, #b6c7c1)",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* Validation Messages */}
      {errorMessage && (
        <span
          role="alert"
          style={{
            fontSize: "11px",
            color: "var(--red, #ef705c)",
            marginTop: "2px",
          }}
        >
          {errorMessage}
        </span>
      )}
      {warningMessage && !errorMessage && (
        <span
          role="status"
          style={{
            fontSize: "11px",
            color: "var(--amber, #e5a44b)",
            marginTop: "2px",
          }}
        >
          {warningMessage}
        </span>
      )}

      {/* Suggestion Dropdown Popover */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          role="listbox"
          aria-label="Vorhersagen und Empfehlungen"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 120,
            margin: 0,
            padding: "4px",
            background: "var(--surface-1, #101e1b)",
            border: "1px solid var(--line-strong, #3b5850)",
            borderRadius: "var(--radius, 10px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((item, idx) => {
            const isSelected = idx === highlightedIndex;
            return (
              <div
                key={`${String(item.value)}-${idx}`}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                onClick={() => {
                  setDraftValue(String(item.value));
                  handleCommit(item.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDraftValue(String(item.value));
                    handleCommit(item.value);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm, 6px)",
                  cursor: "pointer",
                  background: isSelected
                    ? "var(--surface-3, #1c2d29)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "3px solid var(--green, #67d6ae)"
                    : "3px solid transparent",
                  transition: "background 0.1s ease",
                  outline: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text, #eef6f2)",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background:
                          item.badge === "⚡ Vorhersage" ||
                          item.badge === "Optimal"
                            ? "var(--green-dim, #174d3f)"
                            : item.badge === "Katalog"
                              ? "var(--blue-dim, #163958)"
                              : "var(--surface-2, #152521)",
                        color:
                          item.badge === "⚡ Vorhersage" ||
                          item.badge === "Optimal"
                            ? "var(--green, #67d6ae)"
                            : item.badge === "Katalog"
                              ? "var(--blue, #62a8ff)"
                              : "var(--text-2, #b6c7c1)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.hint && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--muted, #82958e)",
                      marginTop: "2px",
                    }}
                  >
                    {item.hint}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
