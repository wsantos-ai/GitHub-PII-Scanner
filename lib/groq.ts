import Groq from "groq-sdk";
import type { PIIMatch, Vulnerability, Severity, PIIType } from "@/types/analysis";
import { randomUUID } from "crypto";

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SEVERITY_MAP: Record<PIIType, Severity> = {
  password: "critical",
  token: "critical",
  credit_card: "critical",
  cpf: "high",
  email: "high",
  phone: "medium",
  address: "medium",
  name: "low",
  generic: "low",
};

export async function analyzeWithGroq(
  filePath: string,
  matches: PIIMatch[]
): Promise<Vulnerability[]> {
  if (matches.length === 0) return [];

  const snippets = matches
    .slice(0, 10)
    .map((m) => `Linha ${m.line} [${m.type}]: ${m.snippet}`)
    .join("\n");

  const prompt = `Você é um especialista em segurança de dados e LGPD.
Analise os trechos de código abaixo do arquivo "${filePath}" e identifique vulnerabilidades de vazamento de dados pessoais (PII).

Para cada trecho, responda em JSON com o array "vulnerabilities", onde cada item tem:
- "line": número da linha
- "severity": "critical" | "high" | "medium" | "low"
- "piiType": tipo de PII detectado
- "description": descrição clara da vulnerabilidade em português
- "recommendation": recomendação objetiva de correção em português

Trechos suspeitos:
${snippets}

Responda APENAS com JSON válido, sem markdown.`;

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const items: Array<{
      line: number;
      severity: Severity;
      piiType: PIIType;
      description: string;
      recommendation: string;
    }> = parsed.vulnerabilities ?? [];

    return items.map((item) => {
      const match = matches.find((m) => m.line === item.line) ?? matches[0];
      return {
        id: randomUUID(),
        file: filePath,
        severity: item.severity ?? SEVERITY_MAP[match.type] ?? "medium",
        piiType: item.piiType ?? match.type,
        description: item.description ?? `Dado sensível detectado: ${match.type}`,
        line: item.line ?? match.line,
        snippet: match.snippet,
        recommendation:
          item.recommendation ?? "Remova ou mascare o dado sensível deste trecho.",
      };
    });
  } catch {
    // Fallback: converte matches em vulnerabilidades sem análise semântica
    return matches.slice(0, 5).map((match) => ({
      id: randomUUID(),
      file: filePath,
      severity: SEVERITY_MAP[match.type] ?? "medium",
      piiType: match.type,
      description: `Possível exposição de dado sensível do tipo "${match.type}" detectada.`,
      line: match.line,
      snippet: match.snippet,
      recommendation: "Revise este trecho e remova ou mascare o dado sensível.",
    }));
  }
}
