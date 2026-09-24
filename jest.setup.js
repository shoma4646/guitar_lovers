/**
 * Jest の共通セットアップ
 *
 * ネイティブ実装に依存する部分だけを差し替える。個別テストの jest.mock が優先される。
 */

// モックの useReducedMotion は false を返すので、reduce motion off が既定になる
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
