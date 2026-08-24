import type { HTMLAttributes, ReactNode } from "react";

export function StatusCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <div className={`status-card status-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function InlineWorkflow(props: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={`inline-workflow ${props.className ?? ""}`.trim()}
    />
  );
}

export function DangerZone({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="danger-zone">
      <summary>{summary}</summary>
      <div className="danger-zone-body">{children}</div>
    </details>
  );
}

export function GuidancePanel({
  title,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { title: string; children: ReactNode }) {
  return (
    <aside
      {...props}
      className={`guidance-panel ${props.className ?? ""}`.trim()}
    >
      <h3>{title}</h3>
      {children}
    </aside>
  );
}

export function FieldMessage({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={`field-message field-message-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
