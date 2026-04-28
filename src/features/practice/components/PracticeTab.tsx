import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import WebView from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { colors } from "@/shared/constants/colors";
import {
  usePracticeStore,
  PLAYBACK_RATES,
  extractVideoId,
  type PlaybackRate,
} from "@/stores/practice";
import { useSavePracticeSession } from "@/features/history/api/useSavePracticeSession";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { buildYouTubeHtml } from "@/features/practice/lib/youtubeHtml";
import { formatDuration } from "@/features/practice/lib/formatters";
import { MetronomeWidget } from "./MetronomeWidget";

const SCREEN_WIDTH = Dimensions.get("window").width;

/**
 * 練習タブ - YouTube動画の読み込み・再生コントロール・ブックマーク・メトロノーム
 */
export function PracticeTab() {
  const urlInput = usePracticeStore((s) => s.urlInput);
  const loadedVideoId = usePracticeStore((s) => s.loadedVideoId);
  const elapsedSeconds = usePracticeStore((s) => s.elapsedSeconds);
  const practiceStartTime = usePracticeStore((s) => s.practiceStartTime);
  const abLoop = usePracticeStore((s) => s.abLoop);
  const bookmarks = usePracticeStore((s) => s.bookmarks);
  const playbackRate = usePracticeStore((s) => s.playbackRate);

  const currentTime = usePracticeStore((s) => s.currentTime);
  const setCurrentTime = usePracticeStore((s) => s.setCurrentTime);
  const setDuration = usePracticeStore((s) => s.setDuration);

  const setUrlInput = usePracticeStore((s) => s.setUrlInput);
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const setABLoop = usePracticeStore((s) => s.setABLoop);
  const clearABLoop = usePracticeStore((s) => s.clearABLoop);
  const addBookmark = usePracticeStore((s) => s.addBookmark);
  const removeBookmark = usePracticeStore((s) => s.removeBookmark);
  const setPlaybackRate = usePracticeStore((s) => s.setPlaybackRate);
  const startPracticeTimer = usePracticeStore((s) => s.startPracticeTimer);
  const stopPracticeTimer = usePracticeStore((s) => s.stopPracticeTimer);
  const resetPracticeTimer = usePracticeStore((s) => s.resetPracticeTimer);

  const { mutate: addRecent } = useAddRecentVideo();
  const { mutateAsync: saveSession } = useSavePracticeSession();

  const webViewRef = useRef<WebView>(null);

  const sendToPlayer = useCallback((cmd: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(cmd));
  }, []);

  const [displaySeconds, setDisplaySeconds] = useState(0);
  const isTimerRunning = practiceStartTime !== null;

  useEffect(() => {
    if (!isTimerRunning) {
      setDisplaySeconds(elapsedSeconds);
      return;
    }
    const timer = setInterval(() => {
      const additional = Math.floor(
        (Date.now() - (practiceStartTime ?? 0)) / 1000,
      );
      setDisplaySeconds(elapsedSeconds + additional);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, elapsedSeconds, practiceStartTime]);

  // ABループ: B点到達時にA点にシーク
  useEffect(() => {
    if (!abLoop.enabled || abLoop.pointA === null || abLoop.pointB === null) {
      return;
    }
    if (currentTime >= abLoop.pointB) {
      sendToPlayer({ action: "seek", time: abLoop.pointA });
    }
  }, [currentTime, abLoop, sendToPlayer]);

  const handleLoadVideo = useCallback(() => {
    if (!urlInput.trim()) {
      Alert.alert("エラー", "YouTubeのURLを入力してください");
      return;
    }
    const videoId = extractVideoId(urlInput.trim());
    if (!videoId) {
      Alert.alert("エラー", "有効なYouTube URLを入力してください");
      return;
    }
    loadVideo(videoId);
    addRecent({
      videoId,
      title: `YouTube動画 (${videoId})`,
      lastWatchedAt: new Date().toISOString(),
    });
  }, [urlInput, loadVideo, addRecent]);

  const handleSaveSession = useCallback(async () => {
    const performSave = async () => {
      await saveSession({
        id: randomUUID(),
        date: new Date().toISOString(),
        duration: displaySeconds,
        videoId: loadedVideoId ?? undefined,
      });
      resetPracticeTimer();
      Alert.alert("記録完了", "練習を記録しました");
    };
    if (displaySeconds < 30) {
      Alert.alert("確認", "練習時間が30秒未満です。記録しますか？", [
        { text: "キャンセル", style: "cancel" },
        { text: "記録する", onPress: performSave },
      ]);
      return;
    }
    await performSave();
  }, [displaySeconds, loadedVideoId, resetPracticeTimer, saveSession]);

  const handleAddBookmark = useCallback(() => {
    addBookmark({
      id: randomUUID(),
      time: 0,
      label: `ブックマーク ${bookmarks.length + 1}`,
      createdAt: new Date().toISOString(),
    });
  }, [addBookmark, bookmarks.length]);

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>YouTube URL</Text>
        <View style={styles.urlInputRow}>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={colors.textGray}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleLoadVideo}
            accessibilityLabel="YouTube URL入力"
          />
          <TouchableOpacity
            onPress={handleLoadVideo}
            style={styles.loadButton}
            accessibilityRole="button"
            accessibilityLabel="動画を読み込む"
          >
            <Text style={styles.loadButtonText}>読み込む</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadedVideoId && (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: buildYouTubeHtml(loadedVideoId) }}
            style={styles.webView}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === "time") {
                  setCurrentTime(data.currentTime);
                } else if (data.type === "ready") {
                  setDuration(data.duration);
                }
              } catch {
                // 無視
              }
            }}
          />
        </View>
      )}

      <View style={styles.timerCard}>
        <Text style={styles.timerDisplay}>{formatDuration(displaySeconds)}</Text>
        <View style={styles.timerButtons}>
          <TouchableOpacity
            onPress={isTimerRunning ? stopPracticeTimer : startPracticeTimer}
            style={[
              styles.timerBtn,
              {
                backgroundColor: isTimerRunning ? colors.error : colors.primary,
              },
            ]}
            accessibilityRole="button"
          >
            <Ionicons
              name={isTimerRunning ? "pause" : "play"}
              size={16}
              color={colors.textWhite}
            />
            <Text style={styles.timerBtnText}>
              {isTimerRunning ? "一時停止" : "計測"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSaveSession}
            style={[styles.timerBtn, styles.timerBtnSecondary]}
            accessibilityRole="button"
          >
            <Ionicons name="save-outline" size={16} color={colors.secondary} />
            <Text style={[styles.timerBtnText, { color: colors.secondary }]}>
              記録
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>再生速度</Text>
        <View style={styles.chipRow}>
          {PLAYBACK_RATES.map((rate) => {
            const active = playbackRate === rate;
            return (
              <TouchableOpacity
                key={rate}
                onPress={() => {
                  setPlaybackRate(rate as PlaybackRate);
                  sendToPlayer({ action: "setRate", rate });
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.bgGray,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.textWhite : colors.textGray },
                  ]}
                >
                  {rate}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.abLoopCard}>
        <Text style={styles.subTitle}>ABループ</Text>
        <View style={styles.abLoopButtons}>
          <TouchableOpacity
            onPress={() => setABLoop({ pointA: Math.floor(currentTime) })}
            style={[
              styles.abBtn,
              {
                backgroundColor:
                  abLoop.pointA !== null ? colors.primary : colors.bgGray,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="A点を設定"
          >
            <Text style={styles.abBtnText}>
              A点{" "}
              {abLoop.pointA !== null
                ? `(${formatDuration(abLoop.pointA)})`
                : "未設定"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setABLoop({ pointB: Math.floor(currentTime) })}
            style={[
              styles.abBtn,
              {
                backgroundColor:
                  abLoop.pointB !== null ? colors.primary : colors.bgGray,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="B点を設定"
          >
            <Text style={styles.abBtnText}>
              B点{" "}
              {abLoop.pointB !== null
                ? `(${formatDuration(abLoop.pointB)})`
                : "未設定"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.abLoopFooter}>
          <TouchableOpacity
            onPress={() => setABLoop({ enabled: !abLoop.enabled })}
            style={[
              styles.abToggleBtn,
              {
                backgroundColor: abLoop.enabled
                  ? colors.secondary + "33"
                  : colors.bgGray,
                borderColor: abLoop.enabled ? colors.secondary : colors.bgGray,
              },
            ]}
            disabled={abLoop.pointA === null || abLoop.pointB === null}
            accessibilityRole="switch"
            accessibilityState={{ checked: abLoop.enabled }}
          >
            <Text
              style={[
                styles.abToggleText,
                { color: abLoop.enabled ? colors.secondary : colors.textGray },
              ]}
            >
              {abLoop.enabled ? "ループON" : "ループOFF"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearABLoop}
            style={styles.abClearBtn}
            accessibilityRole="button"
            accessibilityLabel="ABループをクリア"
          >
            <Text style={styles.abClearText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.subTitle}>ブックマーク</Text>
          <TouchableOpacity
            onPress={handleAddBookmark}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="ブックマークを追加"
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {bookmarks.length === 0 ? (
          <Text style={styles.emptyText}>ブックマークはありません</Text>
        ) : (
          bookmarks.map((bm) => (
            <View key={bm.id} style={styles.bookmarkItem}>
              <Ionicons name="bookmark" size={14} color={colors.primary} />
              <Text style={styles.bookmarkLabel}>
                {bm.label ?? formatDuration(bm.time)}
              </Text>
              <Text style={styles.bookmarkTime}>{formatDuration(bm.time)}</Text>
              <TouchableOpacity
                onPress={() => removeBookmark(bm.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="ブックマークを削除"
              >
                <Ionicons name="close" size={16} color={colors.textGray} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <MetronomeWidget />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  tabScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: colors.textGray,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subTitle: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "600",
  },
  urlInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: colors.bgGray,
    color: colors.textWhite,
  },
  loadButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  loadButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "700",
  },
  webViewContainer: {
    height: (SCREEN_WIDTH - 32) * (9 / 16),
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  webView: {
    flex: 1,
  },
  timerCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
    backgroundColor: colors.bgLightDark,
  },
  timerDisplay: {
    color: colors.secondary,
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  timerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerBtnSecondary: {
    backgroundColor: colors.secondary + "33",
    borderColor: colors.secondary,
    borderWidth: 1,
  },
  timerBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  abLoopCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    backgroundColor: colors.bgLightDark,
  },
  abLoopButtons: {
    flexDirection: "row",
    gap: 8,
  },
  abBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  abBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: "600",
  },
  abLoopFooter: {
    flexDirection: "row",
    gap: 8,
  },
  abToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  abToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  abClearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.bgGray,
  },
  abClearText: {
    color: colors.textGray,
    fontSize: 13,
    fontWeight: "600",
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "33",
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.bgLightDark,
  },
  bookmarkLabel: {
    flex: 1,
    color: colors.textWhite,
    fontSize: 14,
  },
  bookmarkTime: {
    color: colors.textGray,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  emptyText: {
    color: colors.textGray,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
});
