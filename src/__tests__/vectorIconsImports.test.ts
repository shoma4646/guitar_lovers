import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");
const ENTRY_IMPORT = /(?:from\s+|require\(\s*|jest\.mock\(\s*|import\(\s*)["']@expo\/vector-icons["']/;

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("@expo/vector-icons の読み込み方", () => {
  it("入口からまとめて読み込まず、アイコンセットごとのパスから読み込む", () => {
    const files = [...listSourceFiles(SRC), path.resolve(SRC, "../jest.setup.js")];
    const offenders = files
      .filter((file) => ENTRY_IMPORT.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});
