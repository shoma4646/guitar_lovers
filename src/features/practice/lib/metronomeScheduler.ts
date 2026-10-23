/**
 * メトロノームの拍スケジューリング（Web Audio定番のlookahead方式）
 *
 * setIntervalの発火間隔そのものをテンポに使うと誤差が蓄積するため、
 * 実際の再生時刻はAudioContextの時間軸上で加算のみして管理する。
 * setIntervalは「lookahead区間に入った拍をまとめて予約する」ためのポーリングにのみ使う。
 */

/** 指定BPMの1拍あたりの秒数を返す */
export function bpmToIntervalSec(bpm: number): number {
  return 60 / bpm;
}

export interface ScheduleBeatsInput {
  /** AudioContext.currentTime基準の現在時刻（秒） */
  now: number;
  /** 次に鳴らす拍の予定時刻（秒） */
  nextBeatTime: number;
  /** 1拍あたりの秒数 */
  intervalSec: number;
  /** この秒数先までの拍を先読みして予約する */
  lookaheadSec: number;
  /** 次に鳴らす拍の小節内インデックス（0始まり） */
  beatIndex: number;
  /** 1小節あたりの拍数 */
  beatsPerBar: number;
}

export interface ScheduledBeat {
  /** AudioContext.currentTime基準の再生時刻（秒） */
  time: number;
  /** 小節頭の拍か */
  isAccent: boolean;
  /** 小節内の拍インデックス */
  beatIndex: number;
}

export interface ScheduleBeatsResult {
  beats: ScheduledBeat[];
  nextBeatTime: number;
  beatIndex: number;
}

/**
 * lookahead区間内に収まる拍を積み上げ、次回呼び出し用の状態を返す
 * JSスレッドの停止などで現在時刻が予定を追い越していた場合、過ぎた拍は鳴らさず
 * 次の未来の拍まで読み飛ばし、小節内の位置も読み飛ばした拍数だけ進める
 */
export function scheduleBeats(input: ScheduleBeatsInput): ScheduleBeatsResult {
  const { now, intervalSec, lookaheadSec, beatsPerBar } = input;
  const beats: ScheduledBeat[] = [];
  let nextBeatTime = input.nextBeatTime;
  let beatIndex = input.beatIndex;

  if (nextBeatTime < now) {
    const missed = Math.ceil((now - nextBeatTime) / intervalSec);
    nextBeatTime += missed * intervalSec;
    beatIndex = (beatIndex + missed) % beatsPerBar;
  }
  // 浮動小数の丸めで上の加算結果が now をわずかに下回ることがあるため残す
  while (nextBeatTime < now) {
    nextBeatTime += intervalSec;
    beatIndex = (beatIndex + 1) % beatsPerBar;
  }

  while (nextBeatTime < now + lookaheadSec) {
    beats.push({ time: nextBeatTime, isAccent: beatIndex === 0, beatIndex });
    nextBeatTime += intervalSec;
    beatIndex = (beatIndex + 1) % beatsPerBar;
  }

  return { beats, nextBeatTime, beatIndex };
}
