import {
  buildTodayMenu,
  computeTodayTargetBpm,
  getLatestAttempt,
  isGraduated,
  pickTodayPick,
  resolveCurrentBpm,
  resolveGraduatedAt,
} from "../progression";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

type GraduationInput = Pick<
  PracticePhrase,
  "currentBpm" | "targetBpm" | "graduatedAt" | "createdAt"
>;

function makeGraduationInput(overrides: Partial<GraduationInput> = {}): GraduationInput {
  return {
    currentBpm: 90,
    targetBpm: 110,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<PhraseAttempt> = {}): PhraseAttempt {
  return {
    id: "a",
    phraseId: "p1",
    date: "2026-08-10T00:00:00.000Z",
    bpm: 70,
    result: "ok",
    ...overrides,
  };
}

function makePhrase(overrides: Partial<PracticePhrase> = {}): PracticePhrase {
  return {
    id: "p1",
    videoId: "dQw4w9WgXcQ",
    videoTitle: "動画",
    name: "フレーズ",
    startSec: 10,
    endSec: 20,
    currentBpm: 70,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getLatestAttempt", () => {
  it("記録が無ければundefinedを返す", () => {
    expect(getLatestAttempt([])).toBeUndefined();
  });

  it("最新日時の記録を返す", () => {
    const older = makeAttempt({ id: "old", date: "2026-08-08T00:00:00.000Z" });
    const newer = makeAttempt({ id: "new", date: "2026-08-10T00:00:00.000Z" });
    expect(getLatestAttempt([older, newer])?.id).toBe("new");
  });

  it("配列の順序に依存せず日時で判定する", () => {
    const older = makeAttempt({ id: "old", date: "2026-08-08T00:00:00.000Z" });
    const newer = makeAttempt({ id: "new", date: "2026-08-10T00:00:00.000Z" });
    expect(getLatestAttempt([newer, older])?.id).toBe("new");
  });
});

describe("resolveCurrentBpm", () => {
  it("記録が無ければ保存済みの到達BPMを返す", () => {
    expect(resolveCurrentBpm(80, [])).toBe(80);
  });

  it("弾けた記録の最大BPMが保存済みより高ければそちらを採る", () => {
    const attempts = [
      makeAttempt({ id: "1", bpm: 120, result: "ok" }),
      makeAttempt({ id: "2", bpm: 150, result: "ng" }),
    ];
    expect(resolveCurrentBpm(80, attempts)).toBe(120);
  });

  it("弾けた記録が保存済みより低ければ後退しない", () => {
    expect(resolveCurrentBpm(80, [makeAttempt({ bpm: 60, result: "ok" })])).toBe(80);
  });
});

describe("computeTodayTargetBpm", () => {
  it("到達BPMで弾けたら+5する", () => {
    const attempt = makeAttempt({ result: "ok", bpm: 70 });
    expect(computeTodayTargetBpm(70, attempt, 200)).toBe(75);
  });

  it("到達BPMより速いテンポで弾けても+5の刻みで進む", () => {
    const attempt = makeAttempt({ result: "ok", bpm: 90 });
    expect(computeTodayTargetBpm(90, attempt, 200)).toBe(95);
  });

  it("到達BPMより遅いテンポでの成功は据え置く", () => {
    const attempt = makeAttempt({ result: "ok", bpm: 60 });
    expect(computeTodayTargetBpm(80, attempt, 200)).toBe(80);
  });

  it("直近の結果がpartialなら据え置く", () => {
    const attempt = makeAttempt({ result: "partial", bpm: 70 });
    expect(computeTodayTargetBpm(70, attempt, 200)).toBe(70);
  });

  it("直近の結果がngなら据え置く", () => {
    const attempt = makeAttempt({ result: "ng", bpm: 70 });
    expect(computeTodayTargetBpm(70, attempt, 200)).toBe(70);
  });

  it("記録が無ければ据え置く", () => {
    expect(computeTodayTargetBpm(70, undefined, 200)).toBe(70);
  });

  it("目標BPMで頭打ちになる", () => {
    const attempt = makeAttempt({ result: "ok", bpm: 98 });
    expect(computeTodayTargetBpm(98, attempt, 100)).toBe(100);
  });

  it("目標BPMが上限240でも240で止まる", () => {
    const attempt = makeAttempt({ result: "ok", bpm: 238 });
    expect(computeTodayTargetBpm(238, attempt, 240)).toBe(240);
  });

  it("既に目標BPMを超えていれば据え置く", () => {
    const attempt = makeAttempt({ result: "ok", bpm: 150 });
    expect(computeTodayTargetBpm(150, attempt, 100)).toBe(150);
  });
});

describe("isGraduated", () => {
  it("到達BPMが目標BPM以上なら到達済みとする", () => {
    expect(isGraduated(120, 120)).toBe(true);
    expect(isGraduated(130, 120)).toBe(true);
  });

  it("到達BPMが目標BPM未満なら到達済みとしない", () => {
    expect(isGraduated(115, 120)).toBe(false);
  });
});

describe("buildTodayMenu", () => {
  it("アーカイブ済みのフレーズを除く", () => {
    const menu = buildTodayMenu(
      [makePhrase({ id: "p1" }), makePhrase({ id: "p2", archivedAt: "2026-08-05T00:00:00.000Z" })],
      [],
    );
    expect(menu.map((e) => e.phrase.id)).toEqual(["p1"]);
  });

  it("前回あやしい/弾けなかった → 記録あり → 未記録 → 目標到達済みの順に並ぶ", () => {
    const phrases = [
      makePhrase({ id: "graduated", currentBpm: 120, targetBpm: 120 }),
      makePhrase({ id: "fresh" }),
      makePhrase({ id: "stale" }),
      makePhrase({ id: "retry" }),
    ];
    const attempts = [
      makeAttempt({ id: "1", phraseId: "stale", result: "ok" }),
      makeAttempt({ id: "2", phraseId: "retry", result: "ng" }),
    ];
    const menu = buildTodayMenu(phrases, attempts);
    expect(menu.map((e) => e.phrase.id)).toEqual(["retry", "stale", "fresh", "graduated"]);
    expect(menu.map((e) => e.priority)).toEqual(["retry", "stale", "fresh", "graduated"]);
  });

  it("最後の結果がpartialでも前回あやしいとして先頭に来る", () => {
    const menu = buildTodayMenu(
      [makePhrase({ id: "stale" }), makePhrase({ id: "retry" })],
      [
        makeAttempt({ id: "1", phraseId: "stale", result: "ok", date: "2026-08-01T00:00:00.000Z" }),
        makeAttempt({ id: "2", phraseId: "retry", result: "partial" }),
      ],
    );
    expect(menu[0].phrase.id).toBe("retry");
  });

  it("記録ありのフレーズは最終記録が古い順に並ぶ", () => {
    const phrases = [makePhrase({ id: "recent" }), makePhrase({ id: "old" })];
    const attempts = [
      makeAttempt({ id: "1", phraseId: "recent", date: "2026-08-10T00:00:00.000Z" }),
      makeAttempt({ id: "2", phraseId: "old", date: "2026-08-03T00:00:00.000Z" }),
    ];
    expect(buildTodayMenu(phrases, attempts).map((e) => e.phrase.id)).toEqual(["old", "recent"]);
  });

  it("前回あやしい/弾けなかった同士は最終記録日ではなくupdatedAtの古い順に並ぶ", () => {
    const phrases = [
      makePhrase({ id: "olderRecord", updatedAt: "2026-08-05T00:00:00.000Z" }),
      makePhrase({ id: "olderUpdate", updatedAt: "2026-08-02T00:00:00.000Z" }),
    ];
    const attempts = [
      makeAttempt({ id: "1", phraseId: "olderRecord", result: "ng", date: "2026-08-06T00:00:00.000Z" }),
      makeAttempt({ id: "2", phraseId: "olderUpdate", result: "ng", date: "2026-08-10T00:00:00.000Z" }),
    ];
    expect(buildTodayMenu(phrases, attempts).map((e) => e.phrase.id)).toEqual([
      "olderUpdate",
      "olderRecord",
    ]);
  });

  it("同順位はupdatedAtの古い順、それも同じならidの順に並ぶ", () => {
    const phrases = [
      makePhrase({ id: "c", updatedAt: "2026-08-05T00:00:00.000Z" }),
      makePhrase({ id: "b", updatedAt: "2026-08-02T00:00:00.000Z" }),
      makePhrase({ id: "a", updatedAt: "2026-08-05T00:00:00.000Z" }),
    ];
    expect(buildTodayMenu(phrases, []).map((e) => e.phrase.id)).toEqual(["b", "a", "c"]);
  });

  it("目標BPM到達済みなら最後の結果がngでも末尾に回る", () => {
    const phrases = [
      makePhrase({ id: "graduated", currentBpm: 120, targetBpm: 120 }),
      makePhrase({ id: "fresh" }),
    ];
    const attempts = [makeAttempt({ phraseId: "graduated", result: "ng", bpm: 120 })];
    const menu = buildTodayMenu(phrases, attempts);
    expect(menu.map((e) => e.phrase.id)).toEqual(["fresh", "graduated"]);
    expect(menu[1].priority).toBe("graduated");
  });

  it("保存済みの到達BPMが未更新でも、弾けた記録で目標に届いていれば到達済みとする", () => {
    const menu = buildTodayMenu(
      [makePhrase({ currentBpm: 100, targetBpm: 120 })],
      [makeAttempt({ result: "ok", bpm: 120 })],
    );
    expect(menu[0].priority).toBe("graduated");
  });

  it("記録の配列順に依存せず最新の結果で区分する", () => {
    const attempts = [
      makeAttempt({ id: "new", result: "ng", date: "2026-08-10T00:00:00.000Z" }),
      makeAttempt({ id: "old", result: "ok", date: "2026-08-08T00:00:00.000Z" }),
    ];
    const menu = buildTodayMenu([makePhrase()], attempts);
    expect(menu[0].priority).toBe("retry");
    expect(menu[0].latest?.id).toBe("new");
  });

  it("今日の目標BPMは記録を加味した到達BPMから算出する", () => {
    const menu = buildTodayMenu(
      [makePhrase({ currentBpm: 70, targetBpm: 120 })],
      [makeAttempt({ result: "ok", bpm: 80 })],
    );
    expect(menu[0].todayTargetBpm).toBe(85);
  });
});

describe("pickTodayPick", () => {
  it("並び替え済みメニューの先頭を返す", () => {
    const menu = buildTodayMenu(
      [makePhrase({ id: "fresh" }), makePhrase({ id: "retry" })],
      [makeAttempt({ phraseId: "retry", result: "ng" })],
    );
    expect(pickTodayPick(menu)?.phrase.id).toBe("retry");
  });

  it("全件が目標BPM到達済みならundefinedを返す", () => {
    const menu = buildTodayMenu([makePhrase({ currentBpm: 120, targetBpm: 120 })], []);
    expect(pickTodayPick(menu)).toBeUndefined();
  });

  it("メニューが空ならundefinedを返す", () => {
    expect(pickTodayPick([])).toBeUndefined();
  });
});

describe("resolveGraduatedAt", () => {
  it("未到達ならundefinedを返す", () => {
    expect(resolveGraduatedAt(makeGraduationInput(), [])).toBeUndefined();
  });

  it("保存済みのgraduatedAtがあればそれを返す", () => {
    const phrase = makeGraduationInput({
      currentBpm: 110,
      graduatedAt: "2026-08-05T00:00:00.000Z",
    });
    const attempts = [makeAttempt({ bpm: 110, date: "2026-08-03T00:00:00.000Z" })];
    expect(resolveGraduatedAt(phrase, attempts)).toBe("2026-08-05T00:00:00.000Z");
  });

  it("graduatedAtが無ければ目標BPM以上で弾けた最初の記録の日時を返す", () => {
    const attempts = [
      makeAttempt({ id: "late", bpm: 115, date: "2026-08-09T00:00:00.000Z" }),
      makeAttempt({ id: "partial", bpm: 110, result: "partial", date: "2026-08-02T00:00:00.000Z" }),
      makeAttempt({ id: "first", bpm: 110, date: "2026-08-04T00:00:00.000Z" }),
      makeAttempt({ id: "slow", bpm: 100, date: "2026-08-01T00:00:00.000Z" }),
    ];
    expect(resolveGraduatedAt(makeGraduationInput(), attempts)).toBe(
      "2026-08-04T00:00:00.000Z",
    );
  });

  it("記録なしで保存時から目標以上ならcreatedAtを返す", () => {
    const phrase = makeGraduationInput({ currentBpm: 120, targetBpm: 110 });
    expect(resolveGraduatedAt(phrase, [])).toBe("2026-08-01T00:00:00.000Z");
  });

  it("目標BPMを引き上げて未到達になれば、古いgraduatedAtが残っていても未卒業", () => {
    const phrase = makeGraduationInput({
      currentBpm: 110,
      targetBpm: 130,
      graduatedAt: "2026-08-05T00:00:00.000Z",
    });
    const attempts = [makeAttempt({ bpm: 110 })];
    expect(resolveGraduatedAt(phrase, attempts)).toBeUndefined();
  });

  it("到達BPMが未更新でも弾けた記録で目標に届いていれば卒業", () => {
    const attempts = [makeAttempt({ bpm: 110, date: "2026-08-06T00:00:00.000Z" })];
    expect(resolveGraduatedAt(makeGraduationInput({ currentBpm: 90 }), attempts)).toBe(
      "2026-08-06T00:00:00.000Z",
    );
  });

  it("graduatedAt未保存の到達済みフレーズへ新しい記録を追加しても、卒業日は最初の到達日のまま", () => {
    const phrase = makeGraduationInput({ currentBpm: 90 });
    const firstReached = makeAttempt({ id: "first", bpm: 110, date: "2026-08-04T00:00:00.000Z" });
    const today = makeAttempt({ id: "today", bpm: 115, date: "2026-08-20T00:00:00.000Z" });
    expect(resolveGraduatedAt(phrase, [firstReached, today])).toBe("2026-08-04T00:00:00.000Z");
  });
});
