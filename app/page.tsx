"use client";

import { useState } from "react";
import { RepoInput } from "@/components/RepoInput";
import { AnalysisReportView } from "@/components/AnalysisReport";
import type { AnalysisReport } from "@/types/analysis";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(repoUrl: string, githubToken: string, branch: string) {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, githubToken, branch }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao analisar repositório");
      }

      const data: AnalysisReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            GitHub PII Scanner
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Analise repositórios GitHub em busca de vulnerabilidades de vazamento de dados
            pessoais (PII) com análise semântica por IA.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <RepoInput onAnalyze={handleAnalyze} loading={loading} />
        </div>

        {loading && (
          <div className="text-center py-12 space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Analisando repositório... isso pode levar alguns segundos.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {report && !loading && <AnalysisReportView report={report} />}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Análise semântica por{" "}
          <span className="font-medium">Groq · Llama 3.3 70B</span> · Detecção de padrões
          por regex + heurísticas
        </p>
      </div>
    </main>
  );
}
