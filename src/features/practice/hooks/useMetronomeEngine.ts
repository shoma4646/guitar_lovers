/**
 * メトロノームの音出しロジック
 *
 * BPM表示・ON/OFF操作のUIは呼び出し側（PracticeControlPanel）が持ち、ここでは
 * 有効時のクリック音再生と、拍に合わせた拍ストア（useMetronomeBeatStore）の更新だけを担当する。
 * 拍は呼び出し側のstateに載せないため、拍が進んでも呼び出し側は描き直されない。
 * 旧MetronomeWidgetのスケジューリング処理をそのまま移設したもの。
 */

import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { AudioContext, AudioManager } from "react-native-audio-api";
import { usePracticeStore } from "@/stores/practice";
import { useMetronomeBeatStore } from "@/stores/metronomeBeat";
import {
  bpmToIntervalSec,
  METRONOME_LOOKAHEAD_SEC,
  METRONOME_TICK_INTERVAL_MS,
  scheduleBeats,
} from "@/features/practice/lib/metronomeScheduler";
import { scheduleClick } from "@/features/practice/lib/metronomeClick";
import { useStopMetronomeOnBlur } from "./useStopMetronomeOnBlur";

const BEATS_PER_BAR = 4;
/** 開始直後の最初の拍までの猶予。0だとAudioContext起動前の時刻を予約して鳴らない */
const FIRST_BEAT_DELAY_SEC = 0.05;

export function useMetronomeEngine() {
  const bpm = usePracticeStore((s) => s.metronomeBpm);
  const enabled = usePracticeStore((s) => s.metronomeEnabled);
  useStopMetronomeOnBlur();

  const intervalSecRef = useRef(bpmToIntervalSec(bpm));

  useEffect(() => {
    intervalSecRef.current = bpmToIntervalSec(bpm);
  }, [bpm]);

  useEffect(() => {
    if (!enabled) return;

    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosOptions: ["mixWithOthers"],
    });
    const ctx = new AudioContext();
    let nextBeatTime = ctx.currentTime + FIRST_BEAT_DELAY_SEC;
    let beatIndex = 0;
    const { setActiveBeat } = useMetronomeBeatStore.getState();
    const uiTimers = new Set<ReturnType<typeof setTimeout>>();

    const ticker = setInterval(() => {
      const result = scheduleBeats({
        now: ctx.currentTime,
        nextBeatTime,
        intervalSec: intervalSecRef.current,
        lookaheadSec: METRONOME_LOOKAHEAD_SEC,
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
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveBeat(beat.beatIndex);
        }, delayMs);
        uiTimers.add(timer);
      }
    }, METRONOME_TICK_INTERVAL_MS);

    return () => {
      clearInterval(ticker);
      uiTimers.forEach((timer) => clearTimeout(timer));
      setActiveBeat(0);
      void ctx.close();
    };
  }, [enabled]);

  return { bpm, enabled, beatsPerBar: BEATS_PER_BAR };
}
