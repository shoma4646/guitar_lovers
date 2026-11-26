import { ScrollView } from "react-native";
import { screen } from "@testing-library/react-native";

type ReactTestInstance = ReturnType<typeof screen.getByText>;

function isVerticalScrollView(node: ReactTestInstance): boolean {
  return node.type === ScrollView && !node.props.horizontal;
}

/** 要素が縦スクロールのScrollViewの中に描かれているか */
export function isInsideVerticalScroll(element: ReactTestInstance): boolean {
  for (let node = element.parent; node; node = node.parent) {
    if (isVerticalScrollView(node)) return true;
  }
  return false;
}

/** 描画中の画面で、縦スクロールのScrollViewの中にさらに入れ子になった縦スクロールのScrollViewの数 */
export function countNestedVerticalScrolls(): number {
  const scrolls = screen.UNSAFE_getAllByType(ScrollView).filter(isVerticalScrollView);
  return scrolls.filter(isInsideVerticalScroll).length;
}
