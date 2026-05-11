import type { PIIMatch, PIIType } from "@/types/analysis";

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  description: string;
}

const PATTERNS: PIIPattern[] = [
  {
    type: "cpf",
    pattern: /\b\d{3}[.\-]?\d{3}[.\-]?\d{3}[-.]?\d{2}\b/g,
    description: "CPF brasileiro",
  },
  {
    type: "email",
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    description: "Endereço de e-mail",
  },
  {
    type: "phone",
    pattern: /(\+?55\s?)?(\(?\d{2}\)?[\s\-]?)(\d{4,5}[\s\-]?\d{4})/g,
    description: "Número de telefone brasileiro",
  },
  {
    type: "credit_card",
    pattern: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
    description: "Número de cartão de crédito",
  },
  {
    type: "password",
    pattern: /(?:password|senha|passwd|pwd)\s*[:=]\s*["']?[^\s"']{4,}["']?/gi,
    description: "Senha em texto plano",
  },
  {
    type: "token",
    pattern:
      /(?:api[_\-]?key|token|secret|bearer)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi,
    description: "Token ou chave de API",
  },
  {
    type: "address",
    pattern: /(?:rua|av(?:enida)?|alameda|travessa|estrada)\s+[A-Za-zÀ-ÿ\s,\d]+/gi,
    description: "Endereço residencial",
  },
];

const SENSITIVE_FIELD_NAMES = [
  "cpf",
  "cnpj",
  "rg",
  "email",
  "telefone",
  "celular",
  "phone",
  "senha",
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "credit_card",
  "cartao",
  "nome_completo",
  "full_name",
  "data_nascimento",
  "birth_date",
  "endereco",
  "address",
  "cep",
  "zipcode",
  "ssn",
  "passaporte",
  "passport",
];

const SENSITIVE_FIELD_REGEX = new RegExp(
  `\\b(${SENSITIVE_FIELD_NAMES.join("|")})\\b`,
  "gi"
);

export function scanFileContent(content: string, filePath: string): PIIMatch[] {
  const lines = content.split("\n");
  const matches: PIIMatch[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const { type, pattern } of PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        matches.push({
          type,
          pattern: match[0],
          line: lineIndex + 1,
          column: match.index + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    }

    // Detecta campos com nomes sensíveis (ex: coluna SQL, atributo JSON)
    if (SENSITIVE_FIELD_REGEX.test(line)) {
      SENSITIVE_FIELD_REGEX.lastIndex = 0;
      const existing = matches.find((m) => m.line === lineIndex + 1);
      if (!existing) {
        matches.push({
          type: "generic",
          pattern: line.match(SENSITIVE_FIELD_REGEX)?.[0] ?? "",
          line: lineIndex + 1,
          column: 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
    SENSITIVE_FIELD_REGEX.lastIndex = 0;
  }

  return matches;
}

export const ANALYZABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".go",
  ".rb",
  ".php",
  ".cs",
  ".env",
  ".json",
  ".yaml",
  ".yml",
  ".sql",
  ".graphql",
  ".prisma",
  ".toml",
]);

export function isAnalyzable(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return (
    ANALYZABLE_EXTENSIONS.has(ext) ||
    filePath.endsWith(".env") ||
    filePath.includes(".env.")
  );
}
