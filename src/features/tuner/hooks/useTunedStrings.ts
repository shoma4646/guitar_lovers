/**
 * チューナーの弦ごとの「チューニング完了」状態を管理するhook
 *
 * ✓は「今合っている」を表すため、合った状態が続いたら付け、ずれた状態が続いたら外す。
 * 画面へフォーカスが戻ったとき・アプリがバックグラウンドから前面に戻ったときは、
 * 離れている間に弦が緩んでいる可能性があるため全弦を未チューニングに戻す。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { TUNING_THRESHOLD_CENTS } from "@/shared/constants/tuning";

/** 許容範囲内がこの時間続いたら弦をチューニング済みにする */
const TUNED_HOLD_MS = 500;

/** チューニング済みの弦で許容範囲外がこの時間続いたら✓を外す。音程の一瞬の揺れでは外さない */
const DETUNED_HOLD_MS = 1000;

const UNTUNED_STRINGS: readonly boolean[] = [false, false, false, false, false, false];

/** 検出音に最も近い弦と、その弦からのセント差 */
export type NearestString = { index: number; cents: number };

export type TunedStrings = {
  /** 弦ごと（6弦〜1弦の順）のチューニング完了状態 */
  tunedStrings: readonly boolean[];
  /** 全弦を未チューニングに戻す */
  resetTunedStrings: () => void;
};

/**
 * 検出音に最も近い弦の判定から、弦ごとのチューニング完了状態を決める
 * @param nearest - 検出音に最も近い弦。音を拾っていないときは null（無音は「ずれ」として数えない）
 */
export function useTunedStrings(nearest: NearestString | null): TunedStrings {
  const [tunedStrings, setTunedStrings] = useState<readonly boolean[]>(UNTUNED_STRINGS);
  const holdRef = useRef<{ stringIndex: number; inTune: boolean; since: number } | null>(null);

  const resetTunedStrings = useCallback(() => {
    setTunedStrings(UNTUNED_STRINGS);
    holdRef.current = null;
  }, []);

  useFocusEffect(resetTunedStrings);

  useEffect(() => {
    let wentBackground = false;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        wentBackground = true;
      } else if (nextState === "active" && wentBackground) {
        wentBackground = false;
        resetTunedStrings();
      }
    });
    return () => subscription.remove();
  }, [resetTunedStrings]);

  // 検出値は表示と判定が変わったときしか届かないため、同じ判定が続く間も判定できるようタイマーで待つ
  useEffect(() => {
    if (nearest === null) {
      holdRef.current = null;
      return;
    }
    const stringIndex = nearest.index;
    const inTune = Math.abs(nearest.cents) <= TUNING_THRESHOLD_CENTS;
    const now = Date.now();
    const previous = holdRef.current;
    const hold =
      previous !== null && previous.stringIndex === stringIndex && previous.inTune === inTune
        ? previous
        : { stringIndex, inTune, since: now };
    holdRef.current = hold;
    if (tunedStrings[stringIndex] === inTune) return;

    const applyJudgement = () =>
      setTunedStrings((prev) => {
        if (prev[stringIndex] === inTune) return prev;
        const next = [...prev];
        next[stringIndex] = inTune;
        return next;
      });
    const remainingMs = (inTune ? TUNED_HOLD_MS : DETUNED_HOLD_MS) - (now - hold.since);
    if (remainingMs <= 0) {
      applyJudgement();
      return;
    }
    const timer = setTimeout(applyJudgement, remainingMs);
    return () => clearTimeout(timer);
  }, [nearest, tunedStrings]);

  return { tunedStrings, resetTunedStrings };
}
