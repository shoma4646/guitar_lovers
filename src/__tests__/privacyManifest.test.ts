import fs from "fs";
import path from "path";
import appJson from "../../app.json";

const ROOT = path.resolve(__dirname, "../..");
const SKIPPED_DIRS = new Set([".bin", ".cache", "android", "__tests__", "__mocks__"]);

type Declaration = { category: string; reasons: string[] };

function findPrivacyManifests(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name) || /example/i.test(entry.name)) continue;
      findPrivacyManifests(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith(".xcprivacy")) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

type PlistValue = string | boolean | PlistValue[] | { [key: string]: PlistValue };

/** plist（XML）の dict / array / string / true / false だけを読む最小のパーサ */
function parsePlist(xml: string): PlistValue {
  const tokens = [...xml.matchAll(/<(\/?)(dict|array|key|string|true|false)(\s*\/)?>([^<]*)/g)];
  let i = 0;
  const readValue = (): PlistValue => {
    const [, , tag, selfClosing, text] = tokens[i++];
    if (tag === "true" || tag === "false") return tag === "true";
    if (tag === "string") return selfClosing ? "" : (i++, text.trim());
    const isDict = tag === "dict";
    const list: PlistValue[] = [];
    const dict: { [key: string]: PlistValue } = {};
    if (selfClosing) return isDict ? dict : list;
    while (!(tokens[i][1] === "/" && tokens[i][2] === tag)) {
      if (isDict) {
        const key = tokens[i][4].trim();
        i += 2;
        dict[key] = readValue();
      } else {
        list.push(readValue());
      }
    }
    i++;
    return isDict ? dict : list;
  };
  while (tokens[i][2] !== "dict") i++;
  return readValue();
}

/** xcprivacy の NSPrivacyAccessedAPITypes を、カテゴリと理由コードの組に読み出す */
function parseAccessedApiTypes(xml: string): Declaration[] {
  const root = parsePlist(xml) as { NSPrivacyAccessedAPITypes?: { [key: string]: PlistValue }[] };
  return (root.NSPrivacyAccessedAPITypes ?? []).map((t) => ({
    category: t.NSPrivacyAccessedAPIType as string,
    reasons: t.NSPrivacyAccessedAPITypeReasons as string[],
  }));
}

const appDeclarations: Declaration[] = appJson.expo.ios.privacyManifests.NSPrivacyAccessedAPITypes.map((t) => ({
  category: t.NSPrivacyAccessedAPIType,
  reasons: t.NSPrivacyAccessedAPITypeReasons,
}));

function appDeclares(category: string, reason: string): boolean {
  return appDeclarations.some((d) => d.category === category && d.reasons.includes(reason));
}

describe("iOS プライバシーマニフェスト（app.json）", () => {
  const manifests = findPrivacyManifests(path.join(ROOT, "node_modules"));

  it("依存ライブラリのプライバシーマニフェストを見つけられる", () => {
    expect(manifests.length).toBeGreaterThan(0);
  });

  it("react-native 本体の申告（FileTimestamp C617.1）を読み取れる", () => {
    const file = path.join(ROOT, "node_modules/react-native/React/Resources/PrivacyInfo.xcprivacy");
    expect(parseAccessedApiTypes(fs.readFileSync(file, "utf8"))).toContainEqual({
      category: "NSPrivacyAccessedAPICategoryFileTimestamp",
      reasons: ["C617.1"],
    });
  });

  it("依存ライブラリが申告しているカテゴリと理由が、すべて app.json に含まれる", () => {
    const missing = manifests.flatMap((file) =>
      parseAccessedApiTypes(fs.readFileSync(file, "utf8")).flatMap(({ category, reasons }) =>
        reasons
          .filter((reason) => !appDeclares(category, reason))
          .map((reason) => `${path.relative(ROOT, file)}: ${category} ${reason}`),
      ),
    );
    expect(missing).toEqual([]);
  });

  it("申告ファイルを持たない react-native-audio-api の分として SystemBootTime(35F9.1) を申告している", () => {
    expect(appDeclares("NSPrivacyAccessedAPICategorySystemBootTime", "35F9.1")).toBe(true);
  });

  it("トラッキングしないことを申告している", () => {
    expect(appJson.expo.ios.privacyManifests.NSPrivacyTracking).toBe(false);
  });
});
