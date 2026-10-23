import { shouldKeepAwakeDuringPractice } from "../keepAwake";

describe("shouldKeepAwakeDuringPractice", () => {
  it.each([
    [{ hasActivePhrase: true, metronomeEnabled: false }, true],
    [{ hasActivePhrase: false, metronomeEnabled: true }, true],
    [{ hasActivePhrase: true, metronomeEnabled: true }, true],
    [{ hasActivePhrase: false, metronomeEnabled: false }, false],
  ])("%o なら %s", (input, expected) => {
    expect(shouldKeepAwakeDuringPractice(input)).toBe(expected);
  });
});
