import { NextRequest, NextResponse } from "next/server";
import { fetchRepoFiles } from "@/lib/github";
import { scanFileContent } from "@/lib/pii-patterns";
import { analyzeWithGroq } from "@/lib/groq";
import type { AnalysisReport, AnalyzeRequest, Vulnerability } from "@/types/analysis";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body: AnalyzeRequest = await req.json();
  const { repoUrl, githubToken, branch } = body;

  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl é obrigatório" }, { status: 400 });
  }

  const token = githubToken || process.env.GITHUB_TOKEN;

  const files = await fetchRepoFiles(repoUrl, token, branch);

  const allVulnerabilities: Vulnerability[] = [];

  for (const file of files) {
    const matches = scanFileContent(file.content, file.path);
    if (matches.length > 0) {
      const vulns = await analyzeWithGroq(file.path, matches);
      allVulnerabilities.push(...vulns);
    }
  }

  const summary = {
    critical: allVulnerabilities.filter((v) => v.severity === "critical").length,
    high: allVulnerabilities.filter((v) => v.severity === "high").length,
    medium: allVulnerabilities.filter((v) => v.severity === "medium").length,
    low: allVulnerabilities.filter((v) => v.severity === "low").length,
  };

  const filesWithIssues = new Set(allVulnerabilities.map((v) => v.file)).size;

  const report: AnalysisReport = {
    repository: repoUrl,
    analyzedAt: new Date().toISOString(),
    totalFiles: files.length,
    filesWithIssues,
    vulnerabilities: allVulnerabilities,
    summary,
  };

  return NextResponse.json(report);
}
