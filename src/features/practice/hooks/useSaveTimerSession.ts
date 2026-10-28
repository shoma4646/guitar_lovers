import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { randomUUID } from "expo-crypto";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import type { PracticeSession } from "@/shared/types/models";

/** これ未満の練習時間は記録前に確認する */
const SHORT_SESSION_SECONDS = 30;

type Params = {
  /** 練習タイマーの計測秒数 */
  seconds: number;
  videoId: string | null;
  /** 保存に成功したときに呼ぶ（タイマーのリセット等） */
  onSaved: () => void;
};

/**
 * 練習タイマーの計測時間を練習セッションとして記録する。
 * 0秒は記録せず案内し、保存中・30秒未満の確認中の再実行は無視する。保存失敗は外へ投げない
 */
export function useSaveTimerSession({ seconds, videoId, onSaved }: Params) {
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const [isSaving, setIsSaving] = useState(false);
  const isBusyRef = useRef(false);

  const commit = useCallback(
    async (session: PracticeSession) => {
      isBusyRef.current = true;
      setIsSaving(true);
      try {
        await saveSession(session);
        onSaved();
        Alert.alert("記録完了", "練習を記録しました");
      } catch {
        // 失敗の案内はミューテーションの onError が出すので、ここでは握るだけ
      } finally {
        isBusyRef.current = false;
        setIsSaving(false);
      }
    },
    [onSaved, saveSession],
  );

  const saveTimerSession = useCallback(async () => {
    if (isBusyRef.current) return;
    if (seconds <= 0) {
      Alert.alert("記録できません", "記録する練習時間がありません");
      return;
    }
    const session: PracticeSession = {
      id: randomUUID(),
      date: new Date().toISOString(),
      duration: seconds,
      videoId: videoId ?? undefined,
    };
    if (seconds < SHORT_SESSION_SECONDS) {
      isBusyRef.current = true;
      Alert.alert("確認", "練習時間が30秒未満です。記録しますか？", [
        {
          text: "キャンセル",
          style: "cancel",
          onPress: () => {
            isBusyRef.current = false;
          },
        },
        { text: "記録する", onPress: () => void commit(session) },
      ]);
      return;
    }
    await commit(session);
  }, [commit, seconds, videoId]);

  return { saveTimerSession, isSaving };
}
