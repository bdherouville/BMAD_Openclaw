/**
 * State management — reads/writes {projectRoot}/_bmad/state.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { BmadState, ProjectContext } from "../types.ts";

const BMAD_DIR = "_bmad";
const STATE_FILE = "state.json";

export function bmadDir(projectPath: string): string {
  return join(projectPath, BMAD_DIR);
}

export function statePath(projectPath: string): string {
  return join(projectPath, BMAD_DIR, STATE_FILE);
}

export async function readState(projectPath: string): Promise<BmadState | null> {
  try {
    const raw = await readFile(statePath(projectPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.projectName) {
      return null;
    }
    if (!parsed.context || typeof parsed.context !== "object") {
      const projectRoot = resolve(projectPath);
      parsed.context = {
        id: createHash("sha1")
          .update([projectRoot, "", ""].join("|"))
          .digest("hex")
          .slice(0, 12),
        projectRoot,
      };
    }
    // Sanitize: ensure completedWorkflows is always a valid array
    if (!Array.isArray(parsed.completedWorkflows)) {
      parsed.completedWorkflows = [];
    } else {
      // Filter out null/undefined entries
      parsed.completedWorkflows = parsed.completedWorkflows.filter(
        (w: unknown) => w != null && typeof w === "object"
      );
    }
    if (parsed.activeWorkflow && !parsed.activeWorkflow.contextId) {
      parsed.activeWorkflow.contextId = parsed.context.id;
    }
    parsed.completedWorkflows = parsed.completedWorkflows.map((w: any) => ({
      contextId: parsed.context.id,
      ...w,
    }));
    return parsed as BmadState;
  } catch {
    return null;
  }
}

export async function writeState(
  projectPath: string,
  state: BmadState
): Promise<void> {
  const dir = bmadDir(projectPath);
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(projectPath), JSON.stringify(state, null, 2), "utf-8");
}

export function createInitialState(
  projectPath: string,
  projectName: string,
  context: ProjectContext
): BmadState {
  return {
    projectName,
    projectPath,
    createdAt: new Date().toISOString(),
    context,
    currentPhase: "analysis",
    activeWorkflow: null,
    completedWorkflows: [],
  };
}
