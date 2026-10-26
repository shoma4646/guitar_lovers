import { act, renderHook } from "@testing-library/react-native";
import type { ABLoop } from "@/shared/types/models";
import { useSyncPlayerLoop } from "../useSyncPlayerLoop";

const EMPTY: ABLoop = { pointA: null, pointB: null, enabled: false };

function setup(initial: ABLoop) {
  const sendToPlayer = jest.fn();
  const hook = renderHook(({ abLoop }: { abLoop: ABLoop }) => useSyncPlayerLoop(abLoop, sendToPlayer), {
    initialProps: { abLoop: initial },
  });
  return { sendToPlayer, ...hook };
}

describe("useSyncPlayerLoop", () => {
  it("初回描画で現在の区間を送る（フレーズ開始時の区間）", () => {
    const { sendToPlayer } = setup({ pointA: 10, pointB: 20, enabled: true });
    expect(sendToPlayer).toHaveBeenLastCalledWith({
      action: "setLoop",
      enabled: true,
      pointA: 10,
      pointB: 20,
    });
  });

  it("A点・B点の設定、有効/無効の切替、クリアのたびに送る", () => {
    const { sendToPlayer, rerender } = setup(EMPTY);
    sendToPlayer.mockClear();

    rerender({ abLoop: { pointA: 5, pointB: null, enabled: false } });
    rerender({ abLoop: { pointA: 5, pointB: 9, enabled: false } });
    rerender({ abLoop: { pointA: 5, pointB: 9, enabled: true } });
    rerender({ abLoop: EMPTY });

    expect(sendToPlayer.mock.calls.map(([cmd]) => cmd)).toEqual([
      { action: "setLoop", enabled: false, pointA: 5, pointB: null },
      { action: "setLoop", enabled: false, pointA: 5, pointB: 9 },
      { action: "setLoop", enabled: true, pointA: 5, pointB: 9 },
      { action: "setLoop", enabled: false, pointA: null, pointB: null },
    ]);
  });

  it("区間が同じ値のまま再描画されても送らない", () => {
    const { sendToPlayer, rerender } = setup({ pointA: 1, pointB: 2, enabled: true });
    sendToPlayer.mockClear();
    rerender({ abLoop: { pointA: 1, pointB: 2, enabled: true } });
    expect(sendToPlayer).not.toHaveBeenCalled();
  });

  it("準備完了時に呼ぶ関数は最新の区間を送り直す", () => {
    const { sendToPlayer, rerender, result } = setup(EMPTY);
    rerender({ abLoop: { pointA: 3, pointB: 4, enabled: true } });
    sendToPlayer.mockClear();

    act(() => result.current());

    expect(sendToPlayer).toHaveBeenCalledTimes(1);
    expect(sendToPlayer).toHaveBeenCalledWith({
      action: "setLoop",
      enabled: true,
      pointA: 3,
      pointB: 4,
    });
  });
});
