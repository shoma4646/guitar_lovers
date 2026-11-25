import * as fc from "fast-check";
import { buildSwitchConfirmation, findUnsavedWork, formatUnsavedRange } from "../unsavedWork";
import type { ABLoop, Bookmark, PracticePhrase } from "@/shared/types/models";

const VIDEO_ID = "abc123def45";

function phrase(overrides: Partial<PracticePhrase> = {}): PracticePhrase {
  return {
    id: "p1",
    videoId: VIDEO_ID,
    videoTitle: "テスト動画",
    name: "イントロ",
    startSec: 83,
    endSec: 101,
    currentBpm: 80,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function loop(pointA: number | null, pointB: number | null): ABLoop {
  return { pointA, pointB, enabled: pointA !== null && pointB !== null };
}

function bookmark(id: string, time: number): Bookmark {
  return { id, time, createdAt: "2026-09-01T00:00:00.000Z" };
}

function find(abLoop: ABLoop, options: { bookmarks?: Bookmark[]; phrases?: PracticePhrase[] } = {}) {
  return findUnsavedWork({
    abLoop,
    bookmarks: options.bookmarks ?? [],
    loadedVideoId: VIDEO_ID,
    savedPhrases: options.phrases ?? [],
  });
}

describe("findUnsavedWork", () => {
  it("A点だけなら未保存の区間とみなさない", () => {
    expect(find(loop(83, null))).toEqual({ unsavedRange: null, bookmarkCount: 0 });
  });

  it("B点だけなら未保存の区間とみなさない", () => {
    expect(find(loop(null, 101))).toEqual({ unsavedRange: null, bookmarkCount: 0 });
  });

  it("A点がB点以上（逆転・ゼロ幅）なら未保存の区間とみなさない", () => {
    expect(find(loop(101, 83)).unsavedRange).toBeNull();
    expect(find(loop(83, 83)).unsavedRange).toBeNull();
  });

  it("同じ動画の保存済みフレーズと区間が一致すれば未保存の区間とみなさない", () => {
    const phrases = [phrase({ id: "other", startSec: 10, endSec: 20 }), phrase()];
    expect(find(loop(83, 101), { phrases }).unsavedRange).toBeNull();
  });

  it("どの保存済みフレーズとも区間が一致しなければ未保存の区間とする", () => {
    const phrases = [phrase({ startSec: 83, endSec: 100 })];
    expect(find(loop(83, 101), { phrases }).unsavedRange).toEqual({ startSec: 83, endSec: 101 });
  });

  it("区間が一致しても別の動画のフレーズなら未保存の区間とする", () => {
    const phrases = [phrase({ videoId: "zzzzzzzzzzz" })];
    expect(find(loop(83, 101), { phrases }).unsavedRange).toEqual({ startSec: 83, endSec: 101 });
  });

  it("区間が無くブックマークだけあれば、その件数を返す", () => {
    const bookmarks = [bookmark("b1", 5), bookmark("b2", 9)];
    expect(find(loop(null, null), { bookmarks })).toEqual({ unsavedRange: null, bookmarkCount: 2 });
  });

  it("動画を読み込んでいなければ何も未保存とみなさない", () => {
    expect(
      findUnsavedWork({
        abLoop: loop(83, 101),
        bookmarks: [bookmark("b1", 5)],
        loadedVideoId: null,
        savedPhrases: [],
      }),
    ).toEqual({ unsavedRange: null, bookmarkCount: 0 });
  });

  it("有効な区間は、同じ区間のフレーズを保存済みに加えると必ず未保存でなくなる", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6000 }),
        fc.integer({ min: 1, max: 6000 }),
        (a, width) => {
          const abLoop = loop(a / 10, (a + width) / 10);
          expect(find(abLoop).unsavedRange).not.toBeNull();
          const saved = [phrase({ startSec: a / 10, endSec: (a + width) / 10 })];
          expect(find(abLoop, { phrases: saved }).unsavedRange).toBeNull();
        },
      ),
    );
  });
});

describe("buildSwitchConfirmation", () => {
  const NOTHING = { unsavedRange: null, bookmarkCount: 0 };

  it("弾いた回数も未保存のものも無ければ確認しない", () => {
    expect(buildSwitchConfirmation({ practiceRecord: null, unsaved: NOTHING })).toBeNull();
    expect(
      buildSwitchConfirmation({ practiceRecord: { phraseName: "イントロ", completedReps: 0 }, unsaved: NOTHING }),
    ).toBeNull();
  });

  it("区間とブックマークが未保存なら、その内容を確認文に出す", () => {
    expect(
      buildSwitchConfirmation({
        practiceRecord: null,
        unsaved: { unsavedRange: { startSec: 83, endSec: 101 }, bookmarkCount: 2 },
      }),
    ).toEqual({
      title: "保存していない内容が消えます",
      message: "区間 01:23〜01:41とブックマーク2件はまだ保存されていません。切り替えると失われます。",
    });
  });

  it("弾いた回数だけなら従来どおりの確認文", () => {
    expect(
      buildSwitchConfirmation({ practiceRecord: { phraseName: "イントロ", completedReps: 3 }, unsaved: NOTHING }),
    ).toEqual({
      title: "練習中の記録が消えます",
      message: "「イントロ」を3回弾いた記録はまだ保存されていません。切り替えると失われます。",
    });
  });

  it("弾いた回数と未保存の区間・ブックマークが両方あれば、まとめて1つの確認文にする", () => {
    expect(
      buildSwitchConfirmation({
        practiceRecord: { phraseName: "イントロ", completedReps: 1 },
        unsaved: { unsavedRange: { startSec: 5, endSec: 9.5 }, bookmarkCount: 1 },
      }),
    ).toEqual({
      title: "練習中の記録が消えます",
      message:
        "「イントロ」を1回弾いた記録、区間 00:05〜00:09とブックマーク1件はまだ保存されていません。切り替えると失われます。",
    });
  });
});

describe("formatUnsavedRange", () => {
  it("1時間未満の区間は mm:ss で表示する", () => {
    expect(formatUnsavedRange({ startSec: 83, endSec: 101 })).toBe("区間 01:23〜01:41");
  });

  it("終了位置が1時間以上なら、開始位置も時の桁付きで揃える", () => {
    expect(formatUnsavedRange({ startSec: 485, endSec: 4210 })).toBe("区間 0:08:05〜1:10:10");
  });
});
