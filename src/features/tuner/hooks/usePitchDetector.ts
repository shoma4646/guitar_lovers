/**
 * マイク入力からリアルタイムにピッチを検出するhook
 *
 * react-native-audio-apiのAudioRecorderでPCMを受け取り、pitchy（McLeod Pitch Method）で
 * 基本周波数を推定、平滑化した値をstateとして公開する。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { PitchDetector } from "pitchy";
import { createPitchSmoother } from "@/features/tuner/lib/smoothing";

export type PitchDetectorStatus =
  | "idle"
  | "requesting"
  | "denied"
  | "listening"
  | "error";

export interface PitchDetectorState {
  status: PitchDetectorStatus;
  /** 平滑化済みの検出周波数（無音・未検出ならnull） */
  hz: number | null;
  /** 直近の検出信頼度（0〜1） */
  clarity: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const PREFERRED_SAMPLE_RATE = 44100;
/** 約93ms分。6弦E2（82Hz）の周期を複数回含む長さが必要 */
const PREFERRED_BUFFER_LENGTH = 4096;
/** stateの更新頻度の上限。短いバッファで来る端末でも再描画を抑える */
const UI_UPDATE_INTERVAL_MS = 50;
/**
 * pitchyがこのRMS振幅（フルスケール1.0）未満のフレームを検出前に捨てる。減衰末期・無音時のオクターブ誤検出を防ぐ。
 * 実機の減衰カーブで調整する。通常の弾き方で検出が遅れるなら小さく（0.002等）、減衰末期の誤検出が残るなら大きくする
 */
export const MIN_VOLUME_RMS = 0.003;

/** 録音セッションを解放し、Practice画面のメトロノームが前提とする再生設定へ戻す */
function restorePlaybackSession(): void {
  AudioManager.setAudioSessionOptions({
    iosCategory: "playback",
    iosOptions: ["mixWithOthers"],
  });
}

/** マイクからのピッチ検出を開始・停止できるhook */
export function usePitchDetector(): PitchDetectorState {
  const [status, setStatus] = useState<PitchDetectorStatus>("idle");
  const [hz, setHz] = useState<number | null>(null);
  const [clarity, setClarity] = useState(0);

  const recorderRef = useRef<AudioRecorder | null>(null);
  // 権限確認のawait中に再度startが呼ばれてレコーダーが二重生成されないよう、同期的に占有する
  const startingRef = useRef(false);
  // stopのたびに進む世代番号。await中にstopされたstartは、続きを実行せず解放して終わる
  const runIdRef = useRef(0);
  const detectorRef = useRef<{
    inputLength: number;
    detector: PitchDetector<Float32Array>;
  } | null>(null);
  const smootherRef = useRef(createPitchSmoother());
  const lastUiUpdateRef = useRef(0);

  /** 録音リソースを解放し、再度startできる状態に戻す */
  const releaseRecorder = useCallback(async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.clearOnAudioReady();
      recorder.clearOnError();
      if (recorder.isRecording()) {
        await recorder.stop();
      }
    }
    smootherRef.current.reset();
    detectorRef.current = null;
    restorePlaybackSession();
    setHz(null);
    setClarity(0);
  }, []);

  const stop = useCallback(async () => {
    runIdRef.current += 1;
    await releaseRecorder();
    setStatus("idle");
  }, [releaseRecorder]);

  const start = useCallback(async () => {
    if (recorderRef.current || startingRef.current) return;
    startingRef.current = true;
    const runId = runIdRef.current;
    const isCancelled = () => runIdRef.current !== runId;
    try {
      setStatus("requesting");

      const permission = await AudioManager.requestRecordingPermissions();
      if (isCancelled()) return;
      if (permission !== "Granted") {
        setStatus("denied");
        return;
      }

      AudioManager.setAudioSessionOptions({
        iosCategory: "playAndRecord",
        iosMode: "measurement",
        iosOptions: ["defaultToSpeaker"],
      });

      const recorder = new AudioRecorder();
      recorderRef.current = recorder;
      recorder.onError((error) => {
        console.error("[tuner] 録音エラー", error);
        void releaseRecorder().finally(() => setStatus("error"));
      });
      recorder.onAudioReady(
        {
          sampleRate: PREFERRED_SAMPLE_RATE,
          bufferLength: PREFERRED_BUFFER_LENGTH,
          channelCount: 1,
        },
        (event) => {
          const pcm = event.buffer.getChannelData(0);
          // 端末によって希望と異なる長さで届くため、実際の長さに合わせて検出器を作り直す
          if (detectorRef.current?.inputLength !== pcm.length) {
            const detector = PitchDetector.forFloat32Array(pcm.length);
            // minVolumeDecibelsはパワー比（10^(dB/10)）で振幅に換算されるため、RMSを直接指定する
            detector.minVolumeAbsolute = MIN_VOLUME_RMS;
            detectorRef.current = { inputLength: pcm.length, detector };
          }
          const [detectedHz, detectedClarity] =
            detectorRef.current.detector.findPitch(pcm, event.buffer.sampleRate);
          const smoothed = smootherRef.current.push(detectedHz, detectedClarity);

          const now = Date.now();
          if (now - lastUiUpdateRef.current < UI_UPDATE_INTERVAL_MS) return;
          lastUiUpdateRef.current = now;
          setHz(smoothed);
          setClarity(detectedClarity);
        },
      );

      const result = await recorder.start();
      if (isCancelled()) {
        // 開始待ちの間にstopされた。stop側はまだrefが空で解放できていないため、ここで解放する
        recorderRef.current = recorder;
        await releaseRecorder();
        return;
      }
      if (result.status === "error") {
        console.error("[tuner] 録音を開始できません", result.message);
        await releaseRecorder();
        setStatus("error");
        return;
      }
      setStatus("listening");
    } finally {
      startingRef.current = false;
    }
  }, [releaseRecorder]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stop();
      };
    }, [stop]),
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { status, hz, clarity, start, stop };
}
