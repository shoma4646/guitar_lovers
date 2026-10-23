import * as fc from "fast-check";
import { bpmToIntervalSec, scheduleBeats } from "../metronomeScheduler";

describe("bpmToIntervalSec", () => {
  it("BPM60は1拍1秒になる", () => {
    expect(bpmToIntervalSec(60)).toBe(1);
  });

  it("BPM120は1拍0.5秒になる", () => {
    expect(bpmToIntervalSec(120)).toBe(0.5);
  });
});

describe("scheduleBeats", () => {
  it("lookahead区間内の拍だけを返す", () => {
    const result = scheduleBeats({
      now: 0,
      nextBeatTime: 0,
      intervalSec: 0.5,
      lookaheadSec: 0.1,
      beatIndex: 0,
      beatsPerBar: 4,
    });

    expect(result.beats).toHaveLength(1);
    expect(result.beats[0]).toEqual({ time: 0, isAccent: true, beatIndex: 0 });
    expect(result.nextBeatTime).toBe(0.5);
    expect(result.beatIndex).toBe(1);
  });

  it("lookahead区間を跨ぐ複数拍をまとめて返す", () => {
    const result = scheduleBeats({
      now: 0.5,
      nextBeatTime: 0.5,
      intervalSec: 0.5,
      lookaheadSec: 1.7,
      beatIndex: 1,
      beatsPerBar: 4,
    });

    expect(result.beats.map((b) => b.time)).toEqual([0.5, 1.0, 1.5, 2.0]);
    expect(result.nextBeatTime).toBe(2.5);
    expect(result.beatIndex).toBe(1);
  });

  it("小節頭の拍だけisAccentがtrueになる", () => {
    const result = scheduleBeats({
      now: 0,
      nextBeatTime: 0,
      intervalSec: 0.25,
      lookaheadSec: 1.1,
      beatIndex: 0,
      beatsPerBar: 4,
    });

    expect(result.beats.map((b) => b.isAccent)).toEqual([
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  it("1000拍進めても累積ドリフトが出ない", () => {
    const bpm = 137;
    const intervalSec = 60 / bpm;
    const start = 0;
    let state = {
      nextBeatTime: start,
      beatIndex: 0,
    };

    for (let i = 0; i < 1000; i += 1) {
      const result = scheduleBeats({
        now: state.nextBeatTime,
        nextBeatTime: state.nextBeatTime,
        intervalSec,
        lookaheadSec: 0.0001,
        beatIndex: state.beatIndex,
        beatsPerBar: 4,
      });
      state = { nextBeatTime: result.nextBeatTime, beatIndex: result.beatIndex };
    }

    expect(state.nextBeatTime).toBeCloseTo(start + 1000 * intervalSec, 9);
  });

  it("現在時刻が予定を大きく追い越していたら取りこぼした拍は鳴らさず読み飛ばす", () => {
    const result = scheduleBeats({
      now: 3.0,
      nextBeatTime: 0,
      intervalSec: 0.5,
      lookaheadSec: 0.1,
      beatIndex: 0,
      beatsPerBar: 4,
    });

    expect(result.beats.map((b) => b.time)).toEqual([3.0]);
    expect(result.beats[0].beatIndex).toBe(2);
    expect(result.nextBeatTime).toBe(3.5);
  });

  it("本番の先読み0.1秒とポーリング25msの組では拍が抜けない", () => {
    const intervalSec = 60 / 240;
    let state = { nextBeatTime: 0.05, beatIndex: 0 };
    const scheduled: number[] = [];
    for (let tick = 0; tick < 400; tick += 1) {
      const result = scheduleBeats({
        now: tick * 0.025,
        nextBeatTime: state.nextBeatTime,
        intervalSec,
        lookaheadSec: 0.1,
        beatIndex: state.beatIndex,
        beatsPerBar: 4,
      });
      scheduled.push(...result.beats.map((b) => b.time));
      state = { nextBeatTime: result.nextBeatTime, beatIndex: result.beatIndex };
    }
    const expectedCount = Math.floor((400 * 0.025 + 0.1 - 0.05) / intervalSec) + 1;
    expect(scheduled).toHaveLength(expectedCount);
    scheduled.forEach((time, i) => {
      expect(time).toBeCloseTo(0.05 + i * intervalSec, 9);
    });
  });

  it("BPM変更でintervalSecを差し替えると次拍から新しい間隔になる", () => {
    const first = scheduleBeats({
      now: 0,
      nextBeatTime: 0,
      intervalSec: 0.5,
      lookaheadSec: 0.1,
      beatIndex: 0,
      beatsPerBar: 4,
    });

    const second = scheduleBeats({
      now: 0.5,
      nextBeatTime: first.nextBeatTime,
      intervalSec: 0.25,
      lookaheadSec: 0.1,
      beatIndex: first.beatIndex,
      beatsPerBar: 4,
    });

    expect(second.beats[0].time).toBe(0.5);
    expect(second.nextBeatTime).toBe(0.75);
  });
});

describe("scheduleBeats: 処理の詰まりを挟んだポーリング", () => {
  const LOOKAHEAD_SEC = 0.1;
  const TICK_SEC = 0.025;
  const BEATS_PER_BAR = 4;
  const START = 0.05;

  type Poll = { jitterSec: number; stallBeats: number };

  /** 本番と同じ呼び出し方でポーリングを回し、予約された拍と予約時点の時刻を集める */
  function runPolls(bpm: number, polls: Poll[]) {
    const intervalSec = bpmToIntervalSec(bpm);
    let state = { nextBeatTime: START, beatIndex: 0 };
    let now = 0;
    const scheduled: { time: number; beatIndex: number; polledAt: number }[] = [];
    for (const poll of polls) {
      now += TICK_SEC + poll.jitterSec + poll.stallBeats * intervalSec;
      const result = scheduleBeats({
        now,
        nextBeatTime: state.nextBeatTime,
        intervalSec,
        lookaheadSec: LOOKAHEAD_SEC,
        beatIndex: state.beatIndex,
        beatsPerBar: BEATS_PER_BAR,
      });
      scheduled.push(...result.beats.map((b) => ({ ...b, polledAt: now })));
      state = { nextBeatTime: result.nextBeatTime, beatIndex: result.beatIndex };
    }
    return { intervalSec, scheduled };
  }

  const bpmArb = fc.integer({ min: 40, max: 240 });
  const pollsArb = fc.array(
    fc.record({
      jitterSec: fc.integer({ min: 0, max: 20_000 }).map((us) => us / 1_000_000),
      stallBeats: fc.oneof(
        { weight: 4, arbitrary: fc.constant(0) },
        { weight: 1, arbitrary: fc.integer({ min: 0, max: 2000 }).map((n) => n / 1000) },
      ),
    }),
    { minLength: 1, maxLength: 200 },
  );

  it("返る拍はすべて予約した時点の現在時刻以降になる", () => {
    fc.assert(
      fc.property(bpmArb, pollsArb, (bpm, polls) => {
        const { scheduled } = runPolls(bpm, polls);
        return scheduled.every((beat) => beat.time >= beat.polledAt);
      }),
    );
  });

  it("隣り合う拍の間隔は拍間隔の整数倍で、詰まらない", () => {
    fc.assert(
      fc.property(bpmArb, pollsArb, (bpm, polls) => {
        const { intervalSec, scheduled } = runPolls(bpm, polls);
        for (let i = 1; i < scheduled.length; i += 1) {
          const gap = scheduled[i].time - scheduled[i - 1].time;
          const multiple = Math.round(gap / intervalSec);
          if (multiple < 1 || Math.abs(gap - multiple * intervalSec) > 1e-9) return false;
        }
        return true;
      }),
    );
  });

  it("読み飛ばした後も小節内の位置は開始からの拍数 mod 拍子と一致する", () => {
    fc.assert(
      fc.property(bpmArb, pollsArb, (bpm, polls) => {
        const { intervalSec, scheduled } = runPolls(bpm, polls);
        return scheduled.every((beat) => {
          const beatsFromStart = Math.round((beat.time - START) / intervalSec);
          return beat.beatIndex === beatsFromStart % BEATS_PER_BAR;
        });
      }),
    );
  });

  it("120BPMで0.45秒詰まったとき、過ぎた拍は予約せず次の未来の拍から再開する", () => {
    const result = scheduleBeats({
      now: 0.95,
      nextBeatTime: 0.5,
      intervalSec: 0.5,
      lookaheadSec: 0.1,
      beatIndex: 1,
      beatsPerBar: 4,
    });

    expect(result.beats).toEqual([{ time: 1.0, isAccent: false, beatIndex: 2 }]);
    expect(result.nextBeatTime).toBe(1.5);
    expect(result.beatIndex).toBe(3);
  });
});
