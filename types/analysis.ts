export type Severity = "critical" | "high" | "medium" | "low";

export type PIIType =
  | "cpf"
  | "email"
  | "phone"
  | "credit_card"
  | "password"
  | "token"
  | "address"
  | "name"
  | "generic";

export interface PIIMatch {
  type: PIIType;
  pattern: string;
  line: number;
  column: number;
  snippet: string;
}

export interface Vulnerability {
  id: string;
  file: string;
  severity: Severity;
  piiType: PIIType;
  description: string;
  line: number;
  snippet: string;
  recommendation: string;
}

export interface FileAnalysis {
  path: string;
  matches: PIIMatch[];
  vulnerabilities: Vulnerability[];
}

export interface AnalysisReport {
  repository: string;
  analyzedAt: string;
  totalFiles: number;
  filesWithIssues: number;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface AnalyzeRequest {
  repoUrl: string;
  githubToken?: string;
  branch?: string;
}
