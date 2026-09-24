/**
 * 動画追加シート
 *
 * ヘッダーの「＋」から開き、YouTube URLを貼り付けて動画を読み込む。
 * 直前に読み込んだ動画が埋め込み不可だった場合は、開いた時点でその案内を先に出す。
 */

import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, radius } from "@/shared/theme";
import { usePracticeStore, extractVideoId } from "@/stores/practice";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { useRecentVideos } from "@/features/practice/api/useRecentVideos";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type SheetState = "idle" | "checking" | "error";
type ErrorKind = "url" | "embed";

/** シート内に表示する最近開いた動画の件数 */
const RECENT_COUNT = 3;

export function AddVideoSheet({ visible, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<SheetState>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const setPracticeSubTab = usePracticeStore((s) => s.setPracticeSubTab);
  const playerError = usePracticeStore((s) => s.playerError);
  const { mutate: addRecent } = useAddRecentVideo();
  const { data: recents = [] } = useRecentVideos();

  // 開いた瞬間だけリセットする。開いている間にplayerErrorが変化しても入力中のURLを消さない
  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setUrl("");
      if (playerError !== null) {
        setState("error");
        setErrorKind("embed");
      } else {
        setState("idle");
        setErrorKind(null);
      }
    }
    wasVisibleRef.current = visible;
  }, [visible, playerError]);

  const openVideo = (videoId: string, title: string) => {
    loadVideo(videoId, title);
    addRecent({ videoId, title, lastWatchedAt: new Date().toISOString() });
    setPracticeSubTab("practice");
    onClose();
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    setState("checking");
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      setState("error");
      setErrorKind("url");
      return;
    }
    openVideo(videoId, `YouTube動画 (${videoId})`);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="動画を追加">
      <View style={{ gap: 16, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              if (state === "error") {
                setState("idle");
                setErrorKind(null);
              }
            }}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            style={{
              flex: 1,
              height: 44,
              borderRadius: radius.md,
              paddingHorizontal: 16,
              backgroundColor: colors.surfaceContainerLow,
              color: colors.onSurface,
              fontSize: 16,
            }}
            accessibilityLabel="YouTube URL入力"
          />
          <Button
            label="読み込む"
            onPress={handleSubmit}
            disabled={state === "checking"}
          />
        </View>

        {state === "error" && errorKind !== null && (
          <View
            style={{
              gap: 4,
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: colors.errorContainer,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.onErrorContainer }}>
              {errorKind === "url"
                ? "YouTubeの動画URLではないようです"
                : "この動画はアプリ内で再生できません"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.onErrorContainer }}>
              {errorKind === "url"
                ? "youtube.com または youtu.be から始まるURLを貼り付けてください。"
                : "投稿者が外部サイトでの再生を許可していない動画です。同じ曲の別の動画を探してください。"}
            </Text>
          </View>
        )}

        {recents.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant }}>
              最近開いた動画
            </Text>
            {recents.slice(0, RECENT_COUNT).map((video) => (
              <Pressable
                key={video.videoId}
                onPress={() => openVideo(video.videoId, video.title)}
                className="active:opacity-80"
                style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 44 }}
                accessibilityRole="button"
                accessibilityLabel={`${video.title}を開く`}
              >
                <Icon name="history" size={18} color={colors.onSurfaceVariant} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.onSurface }} numberOfLines={1}>
                  {video.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
