import { render, screen } from "@testing-library/react-native";
import { Icon, type IconName } from "../Icon";

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => "MaterialCommunityIcons");

const SET_COMPONENT = { material: "MaterialIcons", community: "MaterialCommunityIcons" } as const;

const EXPECTED: Record<string, ["material" | "community", string]> = {
  add: ["material", "add"],
  album: ["material", "album"],
  bolt: ["material", "bolt"],
  check_circle: ["material", "check-circle"],
  equalizer: ["material", "equalizer"],
  error: ["material", "error"],
  history: ["material", "history"],
  mic: ["material", "mic"],
  play_arrow: ["material", "play-arrow"],
  refresh: ["material", "refresh"],
  remove: ["material", "remove"],
  school: ["material", "school"],
  settings: ["material", "settings"],
  star: ["material", "star"],
  timer: ["material", "timer"],
  tune: ["material", "tune"],
  auto_stories: ["material", "auto-stories"],
  emoji_events: ["material", "emoji-events"],
  music_note: ["material", "music-note"],
  play_circle: ["material", "play-circle-outline"],
  share: ["material", "share"],
  bookmark: ["material", "bookmark-border"],
  pause: ["material", "pause"],
  skip_next: ["material", "skip-next"],
  skip_previous: ["material", "skip-previous"],
  close: ["material", "close"],
  check: ["material", "check"],
  trophy: ["community", "trophy-variant"],
  search: ["material", "search"],
  arrow_back: ["material", "arrow-back"],
  more_vert: ["material", "more-vert"],
  menu: ["material", "menu"],
  content_cut: ["material", "content-cut"],
  content_paste: ["material", "content-paste"],
  metronome: ["community", "metronome"],
  circle: ["community", "circle-outline"],
  change_history: ["community", "triangle-outline"],
};

describe("Icon", () => {
  it.each(Object.entries(EXPECTED))("%s は対応するセットとグリフ名で描画される", (name, [set, glyph]) => {
    render(<Icon name={name as IconName} size={18} color="#123456" />);

    expect(screen.root.type).toBe(SET_COMPONENT[set]);
    expect(screen.root.props).toMatchObject({ name: glyph, size: 18, color: "#123456" });
  });

  it("対応表に無い名前は MaterialIcons の help-outline で描画される", () => {
    render(<Icon name={"not_registered" as IconName} />);

    expect(screen.root.type).toBe("MaterialIcons");
    expect(screen.root.props.name).toBe("help-outline");
  });
});
