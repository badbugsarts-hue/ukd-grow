import {
  type ReactNode,
  type RefObject,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";

interface ModalDialogProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  returnFocusTargetRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let openDialogCount = 0;
let previousBodyOverflow = "";

/** Shared modal contract: focus containment, Escape, focus return and scroll lock. */
export function ModalDialog({
  open,
  title,
  eyebrow,
  onClose,
  children,
  className = "",
  closeLabel = "Dialog schließen",
  returnFocusTargetRef,
}: ModalDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const capturedReturnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const explicitReturnTarget = returnFocusTargetRef?.current ?? null;

  useLayoutEffect(() => {
    if (!open) return;
    capturedReturnFocusRef.current =
      explicitReturnTarget ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (openDialogCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogCount += 1;

    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hidden && element.getClientRects().length > 0,
      );
    requestAnimationFrame(() => focusable()[0]?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    // Listen on document so Escape remains reliable even if a browser briefly
    // moves focus to <body> while a portalled dialog is mounted.
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openDialogCount = Math.max(0, openDialogCount - 1);
      if (openDialogCount === 0)
        document.body.style.overflow = previousBodyOverflow;
      const returnTarget = capturedReturnFocusRef.current;
      // WebKit may move focus back to <body> while the portal is being
      // detached. Restore it after that DOM commit, not during cleanup.
      setTimeout(() => {
        if (returnTarget?.isConnected)
          returnTarget.focus({ preventScroll: true });
      }, 0);
    };
  }, [open, explicitReturnTarget]);

  if (!open) return null;
  return createPortal(
    <div
      className="command-center-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`command-center-sheet ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="dialog-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
