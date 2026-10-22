import { onPracticeBlur } from "../playerFocus";

describe("onPracticeBlur", () => {
  it("動画を読み込み済みなら一時停止を1回だけ送る", () => {
    const sendToPlayer = jest.fn();
    onPracticeBlur(sendToPlayer, true);
    expect(sendToPlayer).toHaveBeenCalledTimes(1);
    expect(sendToPlayer).toHaveBeenCalledWith({ action: "pause" });
  });

  it("動画が無ければ何も送らない", () => {
    const sendToPlayer = jest.fn();
    onPracticeBlur(sendToPlayer, false);
    expect(sendToPlayer).not.toHaveBeenCalled();
  });
});
