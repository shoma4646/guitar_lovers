/**
 * アプリエントリポイント
 * 起動時にチューナータブへ即座にリダイレクトする
 */

import { Redirect } from "expo-router";

/**
 * インデックスコンポーネント
 * アプリ起動時にデフォルトタブ（チューナー）へ遷移する
 */
export default function Index() {
  return <Redirect href="/(tabs)/tuner" />;
}
