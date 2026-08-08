export type CellValue = string | number | boolean | null;

export interface WorkbookSheet {
  range: string;
  values: CellValue[][];
  formulas: string[][];
}

export type Workbook = Record<string, WorkbookSheet>;
export type ExperienceLens = "guided" | "advanced" | "expert";
export type RouteId =
  | "cockpit"
  | "today"
  | "timeline"
  | "mix"
  | "climate"
  | "nutrients"
  | "products"
  | "compatibility"
  | "diagnostics"
  | "knowledge"
  | "audit"
  | "raw";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  type: string;
  url: string;
  checkedAt: string;
}

export interface KnowledgeClaim {
  id: string;
  title: string;
  statement: string;
  status: string;
  evidence: "A" | "B" | "C" | "D" | "E";
  scope: string;
  uncertainty: string;
  sourceIds: string[];
}

export interface KnowledgeBase {
  schemaVersion: string;
  reviewedAt: string;
  scope: string;
  evidenceScale: Record<string, string>;
  claims: KnowledgeClaim[];
  sources: Source[];
}

export interface AuditFinding {
  id: string;
  severity: string;
  area: string;
  finding: string;
  risk: string;
  correction: string;
  evidence: string;
  status: string;
  uncertainty: string;
  priority: string;
}
