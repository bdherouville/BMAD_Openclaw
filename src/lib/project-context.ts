import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { ProjectContext } from "../types.ts";

const execFileAsync = promisify(execFile);

export async function detectProjectContext(
  projectPath: string
): Promise<ProjectContext> {
  const projectRoot = resolve(projectPath);
  const repoRoot = await gitValue(projectRoot, ["rev-parse", "--show-toplevel"]);
  const repoRemoteUrl = await gitValue(projectRoot, ["remote", "get-url", "origin"]);
  const repoSlug = repoRemoteUrl ? extractRepoSlug(repoRemoteUrl) : undefined;

  const id = createHash("sha1")
    .update([projectRoot, repoRoot ?? "", repoRemoteUrl ?? ""].join("|"))
    .digest("hex")
    .slice(0, 12);

  return {
    id,
    projectRoot,
    repoRoot: repoRoot ?? undefined,
    repoRemoteUrl: repoRemoteUrl ?? undefined,
    repoSlug,
  };
}

async function gitValue(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], {
      timeout: 3000,
    });
    const value = stdout.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function extractRepoSlug(remoteUrl: string): string | undefined {
  const sshMatch = remoteUrl.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[1];
  }
  return undefined;
}
