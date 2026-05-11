import type { AnalysisReport } from "@/types/analysis";
import { VulnerabilityCard } from "./VulnerabilityCard";
import { FileText, AlertTriangle, Clock, Shield } from "lucide-react";

interface Props {
  report: AnalysisReport;
}

export function AnalysisReportView({ report }: Props) {
  const total =
    report.summary.critical +
    report.summary.high +
    report.summary.medium +
    report.summary.low;

  const riskScore =
    report.summary.critical * 10 +
    report.summary.high * 5 +
    report.summary.medium * 2 +
    report.summary.low;

  const riskLabel =
    riskScore === 0
      ? { label: "Nenhum risco detectado", color: "text-green-600" }
      : riskScore < 10
      ? { label: "Risco baixo", color: "text-blue-600" }
      : riskScore < 30
      ? { label: "Risco médio", color: "text-yellow-600" }
      : riskScore < 60
      ? { label: "Risco alto", color: "text-orange-600" }
      : { label: "Risco crítico", color: "text-red-600" };

  const sortedVulns = [...report.vulnerabilities].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Relatório de Análise PII
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
              {report.repository}
            </p>
          </div>
          <span className={`text-sm font-bold ${riskLabel.color}`}>
            {riskLabel.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat icon={FileText} label="Arquivos analisados" value={report.totalFiles} />
          <Stat icon={AlertTriangle} label="Arquivos com problemas" value={report.filesWithIssues} />
          <Stat icon={Shield} label="Vulnerabilidades" value={total} />
          <Stat
            icon={Clock}
            label="Analisado em"
            value={new Date(report.analyzedAt).toLocaleTimeString("pt-BR")}
          />
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {report.summary.critical > 0 && (
          <Badge count={report.summary.critical} label="Crítico" color="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" />
        )}
        {report.summary.high > 0 && (
          <Badge count={report.summary.high} label="Alto" color="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" />
        )}
        {report.summary.medium > 0 && (
          <Badge count={report.summary.medium} label="Médio" color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" />
        )}
        {report.summary.low > 0 && (
          <Badge count={report.summary.low} label="Baixo" color="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" />
        )}
        {total === 0 && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            Nenhuma vulnerabilidade PII detectada.
          </span>
        )}
      </div>

      {/* Vulnerabilities list */}
      {sortedVulns.length > 0 && (
        <div className="space-y-3">
          {sortedVulns.map((v) => (
            <VulnerabilityCard key={v.id} vulnerability={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function Badge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${color}`}>
      {count} {label}
    </span>
  );
}
