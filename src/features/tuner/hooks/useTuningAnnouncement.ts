/**
 * チューナー判定をスクリーンリーダーで告知する
 *
 * iOSの VoiceOver は accessibilityLiveRegion を読まないため、OSの告知APIで読み上げる。
 * スクリーンリーダーが有効なときだけ告知し、判定の切り替わりは一定時間安定してから読む。
 */

import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  INITIAL_ANNOUNCEMENT_MEMORY,
  nextTuningAnnouncement,
  type AnnouncementMemory,
  type TuningJudgement,
} from "@/features/tuner/lib/announcement";

/** 判定の切り替わりを告知するまでの待ち時間（ミリ秒）。音程の細かい揺れで連続告知しないため */
const TUNING_ANNOUNCE_DEBOUNCE_MS = 500;

function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}

/** 判定が切り替わったとき・弦が合ったときに、スクリーンリーダー有効時だけ読み上げる */
export function useTuningAnnouncement(judgement: TuningJudgement | null): void {
  const screenReaderEnabled = useScreenReaderEnabled();
  const memoryRef = useRef<AnnouncementMemory>(INITIAL_ANNOUNCEMENT_MEMORY);

  const stringNumber = judgement?.stringNumber ?? null;
  const state = judgement?.state ?? null;
  const tuned = judgement?.tuned ?? false;

  useEffect(() => {
    if (!screenReaderEnabled) return;
    const current: TuningJudgement | null =
      stringNumber === null || state === null ? null : { stringNumber, state, tuned };
    const result = nextTuningAnnouncement(memoryRef.current, current);
    const { text } = result;
    if (text === null) {
      memoryRef.current = result.memory;
      return;
    }
    const announce = () => {
      memoryRef.current = result.memory;
      AccessibilityInfo.announceForAccessibility(text);
    };
    if (result.isTuned) {
      announce();
      return;
    }
    const timer = setTimeout(announce, TUNING_ANNOUNCE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [screenReaderEnabled, stringNumber, state, tuned]);
}
