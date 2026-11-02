import { render, screen } from "@testing-library/react-native";
import { PlaybackRateChips } from "../PlaybackRateChips";

describe("PlaybackRateChips", () => {
  it("6つの速度チップすべてで、ラベルを1行に保ち縮小して枠に収める", () => {
    render(<PlaybackRateChips value={1} onChange={jest.fn()} />);

    const chips = screen.getAllByRole("radio");
    expect(chips).toHaveLength(6);
    for (const label of ["0.5x", "0.75x", "1x", "1.25x", "1.5x", "2x"]) {
      const text = screen.getByText(label);
      expect(text.props.numberOfLines).toBe(1);
      expect(text.props.adjustsFontSizeToFit).toBe(true);
    }
  });
});
