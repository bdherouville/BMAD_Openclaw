import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readState,
  writeState,
  createInitialState,
  bmadDir,
  statePath,
} from "../lib/state.ts";
import type { ProjectContext } from "../types.ts";

describe("state", () => {
  let tempDir: string;
  let context: ProjectContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-test-"));
    context = {
      id: "ctx-test-1234",
      projectRoot: tempDir,
    };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("readState returns null for uninitialized project", async () => {
    const state = await readState(tempDir);
    expect(state).toBeNull();
  });

  it("createInitialState creates valid state", () => {
    const state = createInitialState(tempDir, "Test Project", context);
    expect(state.projectName).toBe("Test Project");
    expect(state.projectPath).toBe(tempDir);
    expect(state.context).toEqual(context);
    expect(state.currentPhase).toBe("analysis");
    expect(state.activeWorkflow).toBeNull();
    expect(state.completedWorkflows).toEqual([]);
  });

  it("writeState + readState roundtrip", async () => {
    const state = createInitialState(tempDir, "Test Project", context);
    await writeState(tempDir, state);
    const loaded = await readState(tempDir);
    expect(loaded).toEqual(state);
  });

  it("bmadDir and statePath return correct paths", () => {
    expect(bmadDir("/foo/bar")).toBe("/foo/bar/_bmad");
    expect(statePath("/foo/bar")).toBe("/foo/bar/_bmad/state.json");
  });
});
