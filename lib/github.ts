import { Octokit } from "@octokit/rest";
import { isAnalyzable } from "./pii-patterns";

export interface RepoFile {
  path: string;
  content: string;
}

interface GitTreeItem {
  path?: string;
  type?: string;
  sha?: string;
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const cleaned = url
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  const parts = cleaned.split("/");
  if (parts.length < 2) {
    throw new Error("URL do repositório inválida. Use: https://github.com/owner/repo");
  }

  return { owner: parts[0], repo: parts[1] };
}

export async function fetchRepoFiles(
  repoUrl: string,
  githubToken?: string,
  branch?: string,
  maxFiles = 50
): Promise<RepoFile[]> {
  const octokit = new Octokit({ auth: githubToken });
  const { owner, repo } = parseRepoUrl(repoUrl);

  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const ref = branch || repoData.default_branch;

  if (!ref) {
    throw new Error("Repositório vazio ou sem branch padrão definido.");
  }

  const { data: branchData } = await octokit.repos.getBranch({ owner, repo, branch: ref });
  const treeSha = branchData.commit.commit.tree.sha;

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  const filePaths = (tree.tree as GitTreeItem[])
    .filter((item) => item.type === "blob" && item.path && isAnalyzable(item.path))
    .map((item) => item.path as string)
    .slice(0, maxFiles);

  const files: RepoFile[] = [];

  await Promise.all(
    filePaths.map(async (path) => {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
        if ("content" in data && data.encoding === "base64") {
          const content = Buffer.from(data.content, "base64").toString("utf-8");
          files.push({ path, content });
        }
      } catch {
        // arquivo inacessível, ignora
      }
    })
  );

  return files;
}
