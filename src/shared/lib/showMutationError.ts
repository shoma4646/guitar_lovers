import { Alert } from "react-native";
import { StorageValidationError } from "@/shared/services/storage";

/** mutation失敗時の共通エラーハンドラ。ユーザーへ通知しコンソールへ記録する */
export function showMutationError(error: unknown): void {
  if (error instanceof StorageValidationError) {
    Alert.alert("保存できませんでした", "入力内容に保存できない値が含まれています");
  } else {
    Alert.alert(
      "保存に失敗しました",
      "端末の空き容量やストレージの状態を確認してください"
    );
  }
  console.error("[mutation]", error);
}
