/**
 * Jest の共通セットアップ
 *
 * ネイティブ実装に依存する部分だけを差し替える。個別テストの jest.mock が優先される。
 */

// react-native-reanimated/mock は worklets のネイティブ初期化を通るため使えない。
// テストで必要な API だけを JS で置き換える（reduce motion は off 扱い）
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const identity = (value) => value;

  return {
    __esModule: true,
    default: { View, Text: require("react-native").Text, ScrollView: require("react-native").ScrollView },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (factory) => factory(),
    useDerivedValue: (factory) => ({ value: factory() }),
    useReducedMotion: () => false,
    withTiming: identity,
    withSpring: identity,
    withDelay: (_delay, value) => value,
    withSequence: (...values) => values[values.length - 1],
    runOnJS: (fn) => fn,
    Easing: {
      bezier: () => identity,
      in: identity,
      out: identity,
      inOut: identity,
      linear: identity,
      cubic: identity,
    },
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
    ReducedMotionConfig: () => null,
  };
});

// アイコンフォントの解決はネイティブ依存なので、テストでは表示なしの箱に置き換える
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { MaterialIcons: View, MaterialCommunityIcons: View };
});
