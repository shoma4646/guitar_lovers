/** @jest-environment node */
import fs from "fs";
import path from "path";
import { parse } from "yaml";

const WORKFLOWS_DIR = path.resolve(__dirname, "../../.github/workflows");

type Step = { uses?: string; with?: Record<string, unknown> };
type Workflow = {
  permissions?: string | Record<string, string>;
  jobs: Record<string, { steps?: Step[] }>;
};

const workflows: [string, Workflow][] = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => [name, parse(fs.readFileSync(path.join(WORKFLOWS_DIR, name), "utf8")) as Workflow]);

describe("GitHub Actions ワークフローのトークン権限", () => {
  it("ワークフローを見つけられる", () => {
    expect(workflows.map(([name]) => name)).toContain("ci.yml");
  });

  it("ci.yml はトップレベルで contents: read に絞り、checkout を使っている", () => {
    const ci = workflows.find(([name]) => name === "ci.yml")![1];
    expect(ci.permissions).toEqual({ contents: "read" });
    expect(ci.jobs.check.steps?.some((s) => s.uses?.startsWith("actions/checkout@"))).toBe(true);
  });

  it.each(workflows)("%s はトップレベルの permissions を持ち、書き込み権限を与えていない", (_name, workflow) => {
    expect(workflow.permissions).toBeDefined();
    const values =
      typeof workflow.permissions === "string" ? [workflow.permissions] : Object.values(workflow.permissions ?? {});
    expect(values.filter((v) => v.includes("write"))).toEqual([]);
  });

  it.each(workflows)("%s の actions/checkout はすべて persist-credentials: false を指定している", (_name, workflow) => {
    const checkouts = Object.entries(workflow.jobs).flatMap(([job, { steps = [] }]) =>
      steps
        .filter((s) => s.uses?.startsWith("actions/checkout@"))
        .map((s) => ({ job, persist: s.with?.["persist-credentials"] })),
    );
    expect(checkouts.filter((c) => c.persist !== false)).toEqual([]);
  });
});
