/**
 * メトロノームの今鳴っている拍（小節内インデックス）を持つストア
 *
 * 拍は1秒に何度も進むため、練習画面全体のstateには置かず、拍インジケータだけが購読する。
 */

import { create } from "zustand";

type MetronomeBeatState = {
  activeBeat: number;
  setActiveBeat: (beat: number) => void;
};

export const useMetronomeBeatStore = create<MetronomeBeatState>((set) => ({
  activeBeat: 0,
  setActiveBeat: (beat) => set({ activeBeat: beat }),
}));
