import { z } from "zod";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";
import { PLAYBACK_RATES } from "@/shared/constants/playback";

/** 練習フレーズのZodスキーマ。AsyncStorageの読み書きの両方で検証に使う */
export const practicePhraseSchema = z
  .object({
    id: z.string(),
    videoId: z.string(),
    videoTitle: z.string(),
    /** ユーザーが付ける名前（例: 速弾きフレーズ1） */
    name: z.string(),
    /** 区間開始（秒） */
    startSec: z.number().nonnegative(),
    /** 区間終了（秒） */
    endSec: z.number().nonnegative(),
    /** 現在の到達BPM */
    currentBpm: z.number().int().min(BPM_MIN).max(BPM_MAX),
    /** 目標BPM */
    targetBpm: z.number().int().min(BPM_MIN).max(BPM_MAX),
    /** 区間再生時の再生速度 */
    playbackRate: z.union(PLAYBACK_RATES.map((rate) => z.literal(rate))),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    /** アーカイブ日時（任意）。設定されていれば今日の練習メニューと進捗一覧に表示しない（記録は保持） */
    archivedAt: z.iso.datetime().optional(),
    /** 保存時のBPM（任意）。導入前に保存したフレーズには無い */
    initialBpm: z.number().int().min(BPM_MIN).max(BPM_MAX).optional(),
    /** 目標BPMに到達した日時（任意）。卒業かどうかは到達BPMと目標BPMから判定し、この値単独では判定しない */
    graduatedAt: z.iso.datetime().optional(),
  })
  .refine((phrase) => phrase.startSec < phrase.endSec, {
    message: "区間の終了点は開始点より後である必要があります",
    path: ["endSec"],
  });

export const practicePhrasesSchema = z.array(practicePhraseSchema);
