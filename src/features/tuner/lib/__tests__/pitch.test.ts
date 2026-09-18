import {
  centsBetween,
  frequencyToNote,
  nearestStringInPreset,
  noteToFrequency,
  noteToMidi,
} from "../pitch";

describe("noteToMidi", () => {
  it("A4は69になる", () => {
    expect(noteToMidi("A4")).toBe(69);
  });

  it("フラット表記をシャープに正規化する", () => {
    expect(noteToMidi("Eb2")).toBe(noteToMidi("D#2"));
  });

  it("不正なノート名は例外にする", () => {
    expect(() => noteToMidi("H2")).toThrow();
  });
});

describe("noteToFrequency", () => {
  it("A4は440Hz", () => {
    expect(noteToFrequency("A4")).toBeCloseTo(440, 6);
  });

  it("E2（6弦）は82.41Hz", () => {
    expect(noteToFrequency("E2")).toBeCloseTo(82.41, 2);
  });

  it("E4（1弦）は329.63Hz", () => {
    expect(noteToFrequency("E4")).toBeCloseTo(329.63, 2);
  });
});

describe("centsBetween", () => {
  it("同じ周波数なら0", () => {
    expect(centsBetween(440, 440)).toBe(0);
  });

  it("半音上は+100セント", () => {
    expect(centsBetween(noteToFrequency("A#4"), 440)).toBeCloseTo(100, 6);
  });
});

describe("frequencyToNote", () => {
  it("440HzはA4で0セント", () => {
    const note = frequencyToNote(440);
    expect(note).toMatchObject({ noteName: "A", octave: 4, midi: 69 });
    expect(note.cents).toBeCloseTo(0, 6);
  });

  it("445Hzは約+19.6セント", () => {
    expect(frequencyToNote(445).cents).toBeCloseTo(19.56, 1);
  });

  it("半音の中間より下は下のノートに寄せる", () => {
    const note = frequencyToNote(noteToFrequency("E2") * Math.pow(2, 0.4 / 12));
    expect(note.noteName).toBe("E");
    expect(note.cents).toBeCloseTo(40, 3);
  });
});

describe("nearestStringInPreset", () => {
  const standard = ["E2", "A2", "D3", "G3", "B3", "E4"];
  const dropD = ["D2", "A2", "D3", "G3", "B3", "E4"];

  it("6弦Eの少し低い音は6弦を返す", () => {
    const result = nearestStringInPreset(80, standard);
    expect(result).not.toBeNull();
    expect(result?.index).toBe(0);
    expect(result?.cents).toBeLessThan(0);
  });

  it("ドロップDでは73.4HzがD2（6弦）になる", () => {
    const result = nearestStringInPreset(73.42, dropD);
    expect(result).not.toBeNull();
    expect(result?.index).toBe(0);
    expect(Math.abs(result?.cents ?? NaN)).toBeLessThan(1);
  });

  it("2弦Bの半音上（C4）は2弦を返し、セント差は+100になる", () => {
    const b3 = noteToFrequency("B3");
    const result = nearestStringInPreset(b3 * Math.pow(2, 1 / 12), standard);
    expect(result).not.toBeNull();
    expect(result?.index).toBe(4);
    expect(result?.cents).toBeCloseTo(100, 3);
  });

  it("2弦と1弦のちょうど中間（D4、-200セント）は境界を含むので1弦を返す", () => {
    const result = nearestStringInPreset(noteToFrequency("D4"), standard);
    expect(result?.index).toBe(5);
    expect(result?.cents).toBeCloseTo(-200, 3);
  });

  it("Drop D選択直後の6弦E2（D2から+200セント）は6弦として案内できる", () => {
    const result = nearestStringInPreset(noteToFrequency("E2"), dropD);
    expect(result?.index).toBe(0);
    expect(result?.cents).toBeCloseTo(200, 3);
  });

  it("1弦E4の+250セント（境界超え）はどの弦にも該当せずnull", () => {
    const e4 = noteToFrequency("E4");
    const result = nearestStringInPreset(e4 * Math.pow(2, 250 / 1200), standard);
    expect(result).toBeNull();
  });

  it("3弦G3の2倍音392Hz（E4から+300セント）はどの弦にも該当せずnull", () => {
    const result = nearestStringInPreset(392, standard);
    expect(result).toBeNull();
  });
});
