/**
 * メトロノームの音出しロジック
 *
 * BPM表示・ON/OFF操作のUIは呼び出し側（PracticeControlPanel）が持ち、ここでは
 * 有効時のクリック音再生と、拍に合わせたUI用のactiveBeatの提供だけを担当する。
 * 旧MetronomeWidgetのスケジューリング処理をそのまま移設したもの。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { AudioContext, AudioManager } from "react-native-audio-api";
import { usePracticeStore } from "@/stores/practice";
import { bpmToIntervalSec, scheduleBeats } from "@/features/practice/lib/metronomeScheduler";
import { scheduleClick } from "@/features/practice/lib/metronomeClick";

const BEATS_PER_BAR = 4;
/** 先読み予約する秒数。ポーリング間隔より十分長くしないと拍が抜ける */
const LOOKAHEAD_SEC = 0.1;
const TICK_INTERVAL_MS = 25;
/** 開始直後の最初の拍までの猶予。0だとAudioContext起動前の時刻を予約して鳴らない */
const FIRST_BEAT_DELAY_SEC = 0.05;

export function useMetronomeEngine() {
  const bpm = usePracticeStore((s) => s.metronomeBpm);
  const enabled = usePracticeStore((s) => s.metronomeEnabled);

  const intervalSecRef = useRef(bpmToIntervalSec(bpm));
  const [activeBeat, setActiveBeat] = useState(0);

  useEffect(() => {
    intervalSecRef.current = bpmToIntervalSec(bpm);
  }, [bpm]);

  const animateBeat = useCallback((beatIndex: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveBeat(beatIndex);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosOptions: ["mixWithOthers"],
    });
    const ctx = new AudioContext();
    let nextBeatTime = ctx.currentTime + FIRST_BEAT_DELAY_SEC;
    let beatIndex = 0;
    const uiTimers = new Set<ReturnType<typeof setTimeout>>();

    const ticker = setInterval(() => {
      const result = scheduleBeats({
        now: ctx.currentTime,
        nextBeatTime,
        intervalSec: intervalSecRef.current,
        lookaheadSec: LOOKAHEAD_SEC,
        beatIndex,
        beatsPerBar: BEATS_PER_BAR,
      });
      nextBeatTime = result.nextBeatTime;
      beatIndex = result.beatIndex;

      for (const beat of result.beats) {
        scheduleClick(ctx, beat.time, beat.isAccent);
        const delayMs = Math.max(0, (beat.time - ctx.currentTime) * 1000);
        const timer = setTimeout(() => {
          uiTimers.delete(timer);
          animateBeat(beat.beatIndex);
        }, delayMs);
        uiTimers.add(timer);
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(ticker);
      uiTimers.forEach((timer) => clearTimeout(timer));
      setActiveBeat(0);
      void ctx.close();
    };
  }, [enabled, animateBeat]);

  return { bpm, enabled, activeBeat, beatsPerBar: BEATS_PER_BAR };
}
