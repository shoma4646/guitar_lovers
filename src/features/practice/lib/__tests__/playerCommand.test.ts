import type { onPracticeBlur, PlayerCommand, SendToPlayer } from "../playerFocus";
import type { usePausePlayerOnBlur } from "@/features/practice/hooks/usePausePlayerOnBlur";
import type { useSyncPlayerLoop } from "@/features/practice/hooks/useSyncPlayerLoop";

type CommandOf<F> = F extends (cmd: infer C) => void ? C : never;

// 型の検査は npm run typecheck で行う。@ts-expect-error の行がエラーにならなくなると tsc が落ちる
const sendToPlayer: SendToPlayer = () => {};
const sendFromBlur: Parameters<typeof onPracticeBlur>[0] = sendToPlayer;
const sendFromBlurHook: Parameters<typeof usePausePlayerOnBlur>[0] = sendToPlayer;
const sendFromLoopSync: Parameters<typeof useSyncPlayerLoop>[1] = sendToPlayer;

describe("PlayerCommand の型", () => {
  it("正しい命令は送れる", () => {
    const valid: PlayerCommand[] = [
      { action: "setLoop", enabled: true, pointA: 1, pointB: null },
      { action: "play" },
      { action: "pause" },
      { action: "seek", time: 1 },
      { action: "setRate", rate: 1.5 },
    ];
    valid.forEach(sendToPlayer);
  });

  it("命令名・キー名の書き間違いは型エラーになる", () => {
    // @ts-expect-error seek の位置は time で渡す
    sendToPlayer({ action: "seek", seconds: 1 });
    // @ts-expect-error 命令名は seek
    sendToPlayer({ action: "seekTo", time: 1 });
    // @ts-expect-error setRate の速度は rate で渡す
    sendToPlayer({ action: "setRate", playbackRate: 1 });
    // @ts-expect-error 速度は選択肢にある値だけ
    sendToPlayer({ action: "setRate", rate: 3 });
    // @ts-expect-error setLoop は enabled・pointA・pointB をすべて持つ
    sendToPlayer({ action: "setLoop", enabled: true, pointA: 1 });
    // @ts-expect-error 知らない命令名
    sendToPlayer({ action: "stop" });
  });

  it("プレイヤーへ送る関数を受け取る各所が PlayerCommand 以外を受け付けない", () => {
    const blurCommand: CommandOf<typeof sendFromBlur> = { action: "pause" };
    const blurHookCommand: CommandOf<typeof sendFromBlurHook> = { action: "pause" };
    const loopCommand: CommandOf<typeof sendFromLoopSync> = {
      action: "setLoop",
      enabled: false,
      pointA: null,
      pointB: null,
    };
    // @ts-expect-error onPracticeBlur の送信関数は PlayerCommand だけを受け取る
    sendFromBlur({ action: "seek", seconds: 1 });
    // @ts-expect-error usePausePlayerOnBlur の送信関数は PlayerCommand だけを受け取る
    sendFromBlurHook({ action: "seekTo", time: 1 });
    // @ts-expect-error useSyncPlayerLoop の送信関数は PlayerCommand だけを受け取る
    sendFromLoopSync({ action: "setRate", playbackRate: 1 });

    expect([blurCommand, blurHookCommand, loopCommand]).toHaveLength(3);
  });
});
