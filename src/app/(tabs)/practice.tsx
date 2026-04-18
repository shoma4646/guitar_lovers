/**
 * 練習画面
 * YouTube動画を使った練習機能を提供する。
 * 3タブ構成（練習・プリセット・お気に入り）で動画管理と
 * ABループ、メトロノーム、ブックマーク機能を含む。
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { colors } from "@/shared/constants/colors";
import {
  usePracticeStore,
  PLAYBACK_RATES,
  PRESET_BPMS,
  extractVideoId,
  type PlaybackRate,
} from "@/stores/practice";
import {
  savePracticeSession,
  getFavoriteVideos,
  addFavoriteVideo,
  removeFavoriteVideo,
  getRecentVideos,
  addRecentVideo,
} from "@/shared/services/storage";
import type { VideoPreset, FavoriteVideo, RecentVideo } from "@/shared/types/models";

/** プリセット動画データ */
const practicePresetsData: VideoPreset[] = require("../../../assets/json/practice_presets.json");

/** 画面幅 */
const SCREEN_WIDTH = Dimensions.get("window").width;

/** YouTube IFrame API連携HTML */
function buildYouTubeHtml(videoId: string): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0B0F19; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${safeId}',
        playerVars: { playsinline: 1 },
        events: {
          onReady: function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ready', duration: e.target.getDuration()
            }));
            setInterval(function() {
              if (player && player.getCurrentTime) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'time', currentTime: player.getCurrentTime()
                }));
              }
            }, 200);
          }
        }
      });
    }
    document.addEventListener('message', function(e) { handleMsg(e.data); });
    window.addEventListener('message', function(e) { handleMsg(e.data); });
    function handleMsg(data) {
      try {
        var cmd = JSON.parse(data);
        if (cmd.action === 'play') player.playVideo();
        if (cmd.action === 'pause') player.pauseVideo();
        if (cmd.action === 'seek') player.seekTo(cmd.time, true);
        if (cmd.action === 'setRate') player.setPlaybackRate(cmd.rate);
      } catch(e) {}
    }
  </script>
</body>
</html>
`;
}

/**
 * 秒数を mm:ss 形式にフォーマットする
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** カテゴリ表示名マッピング */
const CATEGORY_LABELS: Record<string, string> = {
  chord: "コード",
  scale: "スケール",
  fingerpicking: "フィンガーピッキング",
  strumming: "ストローク",
  technique: "テクニック",
};

// ============================================================
// サブコンポーネント: メトロノームウィジェット
// ============================================================

/**
 * メトロノームウィジェット
 * BPM調整・プリセット選択・有効/無効の切り替えを提供する
 */
function MetronomeWidget() {
  const bpm = usePracticeStore((s) => s.metronomeBpm);
  const enabled = usePracticeStore((s) => s.metronomeEnabled);
  const setMetronomeBpm = usePracticeStore((s) => s.setMetronomeBpm);
  const setMetronomeEnabled = usePracticeStore((s) => s.setMetronomeEnabled);

  /** メトロノームの拍アニメーション値 */
  const beatScale = useRef(new Animated.Value(1)).current;
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 拍アニメーションの実行(触覚フィードバック付き) */
  const animateBeat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(beatScale, {
        toValue: 1.15,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(beatScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatScale]);

  useEffect(() => {
    if (enabled) {
      const intervalMs = (60 / bpm) * 1000;
      animateBeat();
      beatTimerRef.current = setInterval(animateBeat, intervalMs);
    } else {
      if (beatTimerRef.current) {
        clearInterval(beatTimerRef.current);
        beatTimerRef.current = null;
      }
    }
    return () => {
      if (beatTimerRef.current) {
        clearInterval(beatTimerRef.current);
        beatTimerRef.current = null;
      }
    };
  }, [enabled, bpm, animateBeat]);

  return (
    <View
      style={[
        styles.metronomeContainer,
        { backgroundColor: colors.bgLightDark },
      ]}
    >
      {/* ヘッダー行 */}
      <View style={styles.metronomeHeader}>
        <Text style={[styles.subsectionTitle, { color: colors.textWhite }]}>
          メトロノーム
        </Text>
        <Switch
          value={enabled}
          onValueChange={setMetronomeEnabled}
          trackColor={{ false: colors.bgGray, true: colors.primary + "99" }}
          thumbColor={enabled ? colors.primary : colors.textGray}
          accessibilityLabel="メトロノームのオン/オフ"
        />
      </View>

      {/* BPMサークル表示 */}
      <View style={styles.bpmCircleRow}>
        <TouchableOpacity
          onPress={() => setMetronomeBpm(bpm - 5)}
          style={[styles.bpmAdjustBtn, { backgroundColor: colors.bgGray }]}
          accessibilityLabel="BPMを5下げる"
        >
          <Ionicons name="remove" size={20} color={colors.textWhite} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.bpmCircle,
            {
              backgroundColor: enabled ? colors.primary : colors.bgGray,
              transform: [{ scale: beatScale }],
            },
          ]}
        >
          <Text style={[styles.bpmValue, { color: colors.textWhite }]}>
            {bpm}
          </Text>
          <Text style={[styles.bpmLabel, { color: colors.textWhite + "CC" }]}>
            BPM
          </Text>
        </Animated.View>

        <TouchableOpacity
          onPress={() => setMetronomeBpm(bpm + 5)}
          style={[styles.bpmAdjustBtn, { backgroundColor: colors.bgGray }]}
          accessibilityLabel="BPMを5上げる"
        >
          <Ionicons name="add" size={20} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* プリセットBPMチップ */}
      <View style={styles.bpmPresetRow}>
        {PRESET_BPMS.map((presetBpm) => {
          const active = bpm === presetBpm;
          return (
            <TouchableOpacity
              key={presetBpm}
              onPress={() => setMetronomeBpm(presetBpm)}
              style={[
                styles.bpmChip,
                {
                  backgroundColor: active ? colors.primary : colors.bgGray,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.bpmChipText,
                  { color: active ? colors.textWhite : colors.textGray },
                ]}
              >
                {presetBpm}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// サブコンポーネント: 練習タブ
// ============================================================

/**
 * 練習タブ - YouTube動画の読み込み・再生コントロール・ブックマーク・メトロノーム
 */
function PracticeTab() {
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

  const webViewRef = useRef<WebView>(null);

  /** WebView経由でYouTube IFrame APIにコマンドを送信 */
  const sendToPlayer = useCallback((cmd: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(cmd));
  }, []);

  /** 表示用の経過秒数（1秒ごとに更新） */
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const isTimerRunning = practiceStartTime !== null;

  // タイマーの表示更新
  useEffect(() => {
    if (!isTimerRunning) {
      setDisplaySeconds(elapsedSeconds);
      return;
    }
    const timer = setInterval(() => {
      const additional = Math.floor((Date.now() - (practiceStartTime ?? 0)) / 1000);
      setDisplaySeconds(elapsedSeconds + additional);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, elapsedSeconds, practiceStartTime]);

  // ABループ: B点到達時にA点にシーク
  useEffect(() => {
    if (!abLoop.enabled || abLoop.pointA === null || abLoop.pointB === null) return;
    if (currentTime >= abLoop.pointB) {
      sendToPlayer({ action: "seek", time: abLoop.pointA });
    }
  }, [currentTime, abLoop, sendToPlayer]);

  /**
   * URLを読み込んでYouTubeビデオを表示する
   */
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
    addRecentVideo({
      videoId,
      title: `YouTube動画 (${videoId})`,
      lastWatchedAt: new Date().toISOString(),
    });
  }, [urlInput, loadVideo]);

  /**
   * 練習記録を保存する
   */
  const handleSaveSession = useCallback(async () => {
    if (displaySeconds < 30) {
      Alert.alert("確認", "練習時間が30秒未満です。記録しますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "記録する",
          onPress: async () => {
            await savePracticeSession({
              id: uuidv4(),
              date: new Date().toISOString(),
              duration: displaySeconds,
              videoId: loadedVideoId ?? undefined,
            });
            resetPracticeTimer();
            Alert.alert("記録完了", "練習を記録しました");
          },
        },
      ]);
      return;
    }
    await savePracticeSession({
      id: uuidv4(),
      date: new Date().toISOString(),
      duration: displaySeconds,
      videoId: loadedVideoId ?? undefined,
    });
    resetPracticeTimer();
    Alert.alert("記録完了", "練習を記録しました");
  }, [displaySeconds, loadedVideoId, resetPracticeTimer]);

  /**
   * ブックマークを追加する
   */
  const handleAddBookmark = useCallback(() => {
    addBookmark({
      id: uuidv4(),
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
      {/* URL入力エリア */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
          YouTube URL
        </Text>
        <View style={styles.urlInputRow}>
          <TextInput
            style={[
              styles.urlInput,
              {
                backgroundColor: colors.bgGray,
                color: colors.textWhite,
                borderColor: colors.bgGray,
              },
            ]}
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
            style={[styles.loadButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="動画を読み込む"
          >
            <Text style={[styles.loadButtonText, { color: colors.textWhite }]}>
              読み込む
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* YouTube WebView */}
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
              } catch { /* 無視 */ }
            }}
          />
        </View>
      )}

      {/* 練習タイマーと記録 */}
      <View
        style={[styles.timerCard, { backgroundColor: colors.bgLightDark }]}
      >
        <Text style={[styles.timerDisplay, { color: colors.secondary }]}>
          {formatDuration(displaySeconds)}
        </Text>
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
            <Text style={[styles.timerBtnText, { color: colors.textWhite }]}>
              {isTimerRunning ? "一時停止" : "計測"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSaveSession}
            style={[
              styles.timerBtn,
              { backgroundColor: colors.secondary + "33", borderColor: colors.secondary, borderWidth: 1 },
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="save-outline" size={16} color={colors.secondary} />
            <Text style={[styles.timerBtnText, { color: colors.secondary }]}>
              記録
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 再生速度選択 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
          再生速度
        </Text>
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

      {/* ABループコントロール */}
      <View
        style={[styles.abLoopCard, { backgroundColor: colors.bgLightDark }]}
      >
        <Text style={[styles.subsectionTitle, { color: colors.textWhite }]}>
          ABループ
        </Text>
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
            <Text style={[styles.abBtnText, { color: colors.textWhite }]}>
              A点 {abLoop.pointA !== null ? `(${formatDuration(abLoop.pointA)})` : "未設定"}
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
            <Text style={[styles.abBtnText, { color: colors.textWhite }]}>
              B点 {abLoop.pointB !== null ? `(${formatDuration(abLoop.pointB)})` : "未設定"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.abLoopFooter}>
          <TouchableOpacity
            onPress={() =>
              setABLoop({ enabled: !abLoop.enabled })
            }
            style={[
              styles.abToggleBtn,
              {
                backgroundColor: abLoop.enabled
                  ? colors.secondary + "33"
                  : colors.bgGray,
                borderColor: abLoop.enabled ? colors.secondary : colors.bgGray,
                borderWidth: 1,
              },
            ]}
            disabled={abLoop.pointA === null || abLoop.pointB === null}
            accessibilityRole="switch"
            accessibilityState={{ checked: abLoop.enabled }}
          >
            <Text
              style={[
                styles.abToggleText,
                {
                  color: abLoop.enabled ? colors.secondary : colors.textGray,
                },
              ]}
            >
              {abLoop.enabled ? "ループON" : "ループOFF"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearABLoop}
            style={[styles.abClearBtn, { backgroundColor: colors.bgGray }]}
            accessibilityRole="button"
            accessibilityLabel="ABループをクリア"
          >
            <Text style={[styles.abClearText, { color: colors.textGray }]}>
              クリア
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ブックマーク */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.subsectionTitle, { color: colors.textWhite }]}>
            ブックマーク
          </Text>
          <TouchableOpacity
            onPress={handleAddBookmark}
            style={[styles.addBtn, { backgroundColor: colors.primary + "33" }]}
            accessibilityRole="button"
            accessibilityLabel="ブックマークを追加"
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {bookmarks.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textGray }]}>
            ブックマークはありません
          </Text>
        ) : (
          bookmarks.map((bm) => (
            <View
              key={bm.id}
              style={[
                styles.bookmarkItem,
                { backgroundColor: colors.bgLightDark },
              ]}
            >
              <Ionicons
                name="bookmark"
                size={14}
                color={colors.primary}
              />
              <Text
                style={[styles.bookmarkLabel, { color: colors.textWhite }]}
              >
                {bm.label ?? formatDuration(bm.time)}
              </Text>
              <Text
                style={[styles.bookmarkTime, { color: colors.textGray }]}
              >
                {formatDuration(bm.time)}
              </Text>
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

      {/* メトロノーム */}
      <MetronomeWidget />
    </ScrollView>
  );
}

// ============================================================
// サブコンポーネント: プリセットタブ
// ============================================================

/**
 * プリセットタブ - カテゴリ別動画一覧
 */
function PresetsTab() {
  const loadVideo = usePracticeStore((s) => s.loadVideo);

  /** カテゴリ別にグループ化 */
  const grouped = practicePresetsData.reduce<Record<string, VideoPreset[]>>(
    (acc, preset) => {
      if (!acc[preset.category]) acc[preset.category] = [];
      acc[preset.category].push(preset);
      return acc;
    },
    {}
  );

  const handlePlay = useCallback(
    (preset: VideoPreset) => {
      loadVideo(preset.videoId, preset.title);
      addRecentVideo({
        videoId: preset.videoId,
        title: preset.title,
        lastWatchedAt: new Date().toISOString(),
      });
    },
    [loadVideo]
  );

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(grouped).map(([category, presets]) => (
        <View key={category} style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.textGray }]}
          >
            {CATEGORY_LABELS[category] ?? category}
          </Text>
          {presets.map((preset) => (
            <View
              key={preset.id}
              style={[
                styles.presetCard,
                { backgroundColor: colors.bgLightDark },
              ]}
            >
              {/* サムネイル代替 */}
              <View
                style={[
                  styles.presetThumbnail,
                  { backgroundColor: colors.bgGray },
                ]}
              >
                <Ionicons name="logo-youtube" size={24} color={colors.error} />
              </View>
              <View style={styles.presetInfo}>
                <Text
                  style={[styles.presetTitle, { color: colors.textWhite }]}
                  numberOfLines={2}
                >
                  {preset.title}
                </Text>
                <Text
                  style={[styles.presetCategory, { color: colors.textGray }]}
                >
                  {CATEGORY_LABELS[preset.category] ?? preset.category}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handlePlay(preset)}
                style={[
                  styles.presetPlayBtn,
                  { backgroundColor: colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${preset.title}を再生`}
              >
                <Ionicons name="play" size={18} color={colors.textWhite} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ============================================================
// サブコンポーネント: お気に入りタブ
// ============================================================

/**
 * お気に入りタブ - 最近視聴した動画とお気に入り
 */
function FavoritesTab() {
  const [favorites, setFavorites] = useState<FavoriteVideo[]>([]);
  const [recents, setRecents] = useState<RecentVideo[]>([]);
  const loadVideo = usePracticeStore((s) => s.loadVideo);

  /** データを読み込む */
  const loadData = useCallback(async () => {
    const [favs, recs] = await Promise.all([
      getFavoriteVideos(),
      getRecentVideos(),
    ]);
    setFavorites(favs);
    setRecents(recs);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * お気に入りのトグル
   */
  const handleToggleFavorite = useCallback(
    async (video: RecentVideo) => {
      const isFav = favorites.some((f) => f.videoId === video.videoId);
      if (isFav) {
        await removeFavoriteVideo(video.videoId);
      } else {
        await addFavoriteVideo({
          id: uuidv4(),
          videoId: video.videoId,
          title: video.title,
          addedAt: new Date().toISOString(),
        });
      }
      await loadData();
    },
    [favorites, loadData]
  );

  const handlePlayRecent = useCallback(
    (video: RecentVideo) => {
      loadVideo(video.videoId, video.title);
    },
    [loadVideo]
  );

  const handlePlayFavorite = useCallback(
    (video: FavoriteVideo) => {
      loadVideo(video.videoId, video.title);
    },
    [loadVideo]
  );

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 最近視聴した動画 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
          最近の動画
        </Text>
        {recents.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textGray }]}>
            最近視聴した動画はありません
          </Text>
        ) : (
          recents.map((video) => {
            const isFav = favorites.some((f) => f.videoId === video.videoId);
            return (
              <View
                key={video.videoId}
                style={[
                  styles.videoListItem,
                  { backgroundColor: colors.bgLightDark },
                ]}
              >
                <TouchableOpacity
                  style={styles.videoListItemMain}
                  onPress={() => handlePlayRecent(video)}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.videoThumbSmall,
                      { backgroundColor: colors.bgGray },
                    ]}
                  >
                    <Ionicons
                      name="logo-youtube"
                      size={18}
                      color={colors.error}
                    />
                  </View>
                  <Text
                    style={[
                      styles.videoListTitle,
                      { color: colors.textWhite },
                    ]}
                    numberOfLines={1}
                  >
                    {video.title}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(video)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFav ? "お気に入りから削除" : "お気に入りに追加"
                  }
                >
                  <Ionicons
                    name={isFav ? "heart" : "heart-outline"}
                    size={20}
                    color={isFav ? colors.error : colors.textGray}
                  />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* お気に入り */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
          お気に入り
        </Text>
        {favorites.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textGray }]}>
            お気に入りはありません
          </Text>
        ) : (
          favorites.map((video) => (
            <View
              key={video.videoId}
              style={[
                styles.videoListItem,
                { backgroundColor: colors.bgLightDark },
              ]}
            >
              <TouchableOpacity
                style={styles.videoListItemMain}
                onPress={() => handlePlayFavorite(video)}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.videoThumbSmall,
                    { backgroundColor: colors.bgGray },
                  ]}
                >
                  <Ionicons
                    name="logo-youtube"
                    size={18}
                    color={colors.error}
                  />
                </View>
                <Text
                  style={[styles.videoListTitle, { color: colors.textWhite }]}
                  numberOfLines={1}
                >
                  {video.title}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  removeFavoriteVideo(video.videoId).then(loadData)
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="お気に入りから削除"
              >
                <Ionicons name="heart" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================
// メイン画面コンポーネント
// ============================================================

/** タブの識別子 */
type TabKey = "practice" | "presets" | "favorites";

/** タブ定義 */
const TABS: { key: TabKey; label: string }[] = [
  { key: "practice", label: "練習" },
  { key: "presets", label: "プリセット" },
  { key: "favorites", label: "お気に入り" },
];

/**
 * 練習画面コンポーネント
 */
export default function PracticeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("practice");

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgDark }]}
      edges={["bottom"]}
    >
      {/* タブバー */}
      <View
        style={[styles.innerTabBar, { borderBottomColor: colors.bgGray }]}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.innerTab,
                active && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.innerTabText,
                  { color: active ? colors.primary : colors.textGray },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* タブコンテンツ */}
      {activeTab === "practice" && <PracticeTab />}
      {activeTab === "presets" && <PresetsTab />}
      {activeTab === "favorites" && <FavoritesTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 内部タブバー
  innerTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  innerTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  innerTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // タブコンテンツ
  tabContent: {
    flex: 1,
  },
  tabScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // セクション
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
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
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  // URL入力
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
  },
  loadButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  // WebView
  webViewContainer: {
    height: (SCREEN_WIDTH - 32) * (9 / 16),
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  webView: {
    flex: 1,
  },
  // タイマー
  timerCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  timerDisplay: {
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
  timerBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // チップ
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
  // ABループ
  abLoopCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
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
  },
  abClearText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // ブックマーク
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  bookmarkLabel: {
    flex: 1,
    fontSize: 14,
  },
  bookmarkTime: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  // メトロノーム
  metronomeContainer: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  metronomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bpmCircleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  bpmAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bpmCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bpmValue: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  bpmLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  bpmPresetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  bpmChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  bpmChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // プリセットカード
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 12,
  },
  presetThumbnail: {
    width: 50,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  presetInfo: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  presetCategory: {
    fontSize: 11,
  },
  presetPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // 動画リストアイテム
  videoListItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  videoListItemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  videoThumbSmall: {
    width: 40,
    height: 28,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  videoListTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  // 共通
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
});
