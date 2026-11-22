import type { PlaybackRate } from "@/shared/constants/playback";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import type { SavePhraseInput } from "./parsePhraseDraft";

/** 練習フレーズとして保存するデータを組み立てる。区間・速度・BPMは丸めずそのまま入れる */
export function buildPracticePhrase(params: {
  id: string;
  input: SavePhraseInput;
  range: { pointA: number; pointB: number };
  video: { videoId: string; title: string };
  playbackRate: PlaybackRate;
  now: string;
}): PracticePhrase {
  const { id, input, range, video, playbackRate, now } = params;
  return {
    id,
    videoId: video.videoId,
    videoTitle: video.title || `YouTube動画 (${video.videoId})`,
    name: input.name,
    startSec: range.pointA,
    endSec: range.pointB,
    currentBpm: input.currentBpm,
    initialBpm: input.currentBpm,
    targetBpm: input.targetBpm,
    playbackRate,
    createdAt: now,
    updatedAt: now,
  };
}

/** フレーズ練習の結果として保存する記録を組み立てる。弾いた回数が0なら reps を持たない */
export function buildPhraseAttempt(params: {
  id: string;
  phraseId: string;
  date: string;
  bpm: number;
  result: PhraseAttempt["result"];
  completedReps: number;
}): PhraseAttempt {
  const { id, phraseId, date, bpm, result, completedReps } = params;
  return {
    id,
    phraseId,
    date,
    bpm,
    result,
    // repsは正の整数のみ保存できる（0を渡すと記録の保存自体が失敗する）
    ...(completedReps > 0 ? { reps: completedReps } : {}),
  };
}
