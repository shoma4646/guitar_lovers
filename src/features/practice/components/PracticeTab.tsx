/**
 * 練習タブ（Stitch modern_3 風）
 *
 * URL入力・動画プレイヤー・タイマー・再生速度・ABループ・ブックマーク・メトロノームの
 * 各カードを束ねるコンテナ。WebViewの再生制御（sendToPlayer）はここで一元管理し、
 * 子コンポーネントへはpropsとして渡す。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { randomUUID } from "expo-crypto";
import {
  usePracticeStore,
  extractVideoId,
  type PlaybackRate,
} from "@/stores/practice";
import { colors } from "@/shared/theme";
import { Icon } from "@/shared/components/atoms/Icon";
import type { ABLoop, PracticePhrase } from "@/shared/types/models";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { useSavePracticePhrase } from "@/features/practice/api/useSavePracticePhrase";
import { useRecordPhraseResult } from "@/features/practice/api/useRecordPhraseResult";
import { PhraseNotFoundError } from "@/shared/services/storage";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { MetronomeWidget } from "./MetronomeWidget";
import { VideoLoaderCard } from "./VideoLoaderCard";
import { VideoPlayerCard } from "./VideoPlayerCard";
import { PracticeTimerCard } from "./PracticeTimerCard";
import { PlaybackRateChips } from "./PlaybackRateChips";
import { ABLoopCard, type SavePhraseInput } from "./ABLoopCard";
import { BookmarksCard } from "./BookmarksCard";
import { TodayMenuCard } from "./TodayMenuCard";
import { PhraseResultSheet } from "./PhraseResultSheet";
import { cardShadowStyle, cardStyle } from "./cardStyle";

/** A点とB点が両方設定され、B点がA点より後にあるか */
function isValidLoopRange(abLoop: ABLoop): boolean {
  return (
    abLoop.pointA !== null &&
    abLoop.pointB !== null &&
    abLoop.pointA < abLoop.pointB
  );
}

/** YouTube IFrame APIのエラーコードから、ユーザー向けの案内文を返す */
function describePlayerError(code: number): string {
  switch (code) {
    case 101:
    case 150:
      return "この動画は埋め込み再生が許可されていません";
    case 100:
      return "動画が見つかりません（削除・非公開の可能性）";
    case 2:
      return "動画IDが正しくありません。URLを確認してください";
    case 5:
      return "プレイヤーでエラーが発生しました。しばらくしてからやり直してください";
    case -1:
      return "読み込みに失敗しました。通信状況を確認してください";
    default:
      return "動画を読み込めませんでした。URLと通信状況を確認してください";
  }
}

export function PracticeTab() {
  const urlInput = usePracticeStore((s) => s.urlInput);
  const loadedVideoId = usePracticeStore((s) => s.loadedVideoId);
  const videoTitle = usePracticeStore((s) => s.videoTitle);
  const elapsedSeconds = usePracticeStore((s) => s.elapsedSeconds);
  const practiceStartTime = usePracticeStore((s) => s.practiceStartTime);
  const abLoop = usePracticeStore((s) => s.abLoop);
  const bookmarks = usePracticeStore((s) => s.bookmarks);
  const playbackRate = usePracticeStore((s) => s.playbackRate);
  const metronomeBpm = usePracticeStore((s) => s.metronomeBpm);

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
  const startPhrasePractice = usePracticeStore((s) => s.startPhrasePractice);
  const startPracticeTimer = usePracticeStore((s) => s.startPracticeTimer);
  const stopPracticeTimer = usePracticeStore((s) => s.stopPracticeTimer);
  const resetPracticeTimer = usePracticeStore((s) => s.resetPracticeTimer);
  const videoStartSeconds = usePracticeStore((s) => s.videoStartSeconds);
  const videoInitialRate = usePracticeStore((s) => s.videoInitialRate);
  const videoLoadNonce = usePracticeStore((s) => s.videoLoadNonce);
  const clearVideo = usePracticeStore((s) => s.clearVideo);
  // 「今日の練習メニュー」から開始したフレーズ練習。サブタブ切替をまたいで保持するためストアで管理する
  const activePractice = usePracticeStore((s) => s.activePhrasePractice);
  const setActivePractice = usePracticeStore((s) => s.setActivePhrasePractice);

  const { mutate: addRecent } = useAddRecentVideo();
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const { mutate: savePhrase } = useSavePracticePhrase();
  const { mutateAsync: recordResultAsync } = useRecordPhraseResult();
  const { data: presets = [] } = useVideoPresets();

  const [showResultSheet, setShowResultSheet] = useState(false);
  const playerError = usePracticeStore((s) => s.playerError);
  const setPlayerError = usePracticeStore((s) => s.setPlayerError);
  const pendingAttemptId = usePracticeStore((s) => s.pendingAttemptId);
  const beginResultEntry = usePracticeStore((s) => s.beginResultEntry);

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

  // ABループ: B 点到達時に A 点へシーク
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
        { text: "記録する", onPress: () => void performSave() },
      ]);
      return;
    }
    await performSave();
  }, [displaySeconds, loadedVideoId, resetPracticeTimer, saveSession]);

  const handleAddBookmark = useCallback(() => {
    addBookmark({
      id: randomUUID(),
      time: Math.floor(currentTime),
      label: `ブックマーク ${bookmarks.length + 1}`,
      createdAt: new Date().toISOString(),
    });
  }, [addBookmark, bookmarks.length, currentTime]);

  const handleSavePhrase = useCallback(
    (input: SavePhraseInput) => {
      if (!loadedVideoId) {
        Alert.alert("エラー", "動画を読み込んでから保存してください");
        return;
      }
      if (abLoop.pointA === null || abLoop.pointB === null || !isValidLoopRange(abLoop)) {
        Alert.alert("エラー", "B点はA点より後に設定してください");
        return;
      }
      const now = new Date().toISOString();
      savePhrase(
        {
          id: randomUUID(),
          videoId: loadedVideoId,
          videoTitle: videoTitle || `YouTube動画 (${loadedVideoId})`,
          name: input.name,
          startSec: abLoop.pointA,
          endSec: abLoop.pointB,
          currentBpm: input.currentBpm,
          initialBpm: input.currentBpm,
          targetBpm: input.targetBpm,
          playbackRate,
          createdAt: now,
          updatedAt: now,
        },
        {
          onSuccess: () =>
            Alert.alert("保存しました", `「${input.name}」を今日の練習メニューに追加しました`),
        },
      );
    },
    [loadedVideoId, videoTitle, abLoop, playbackRate, savePhrase],
  );

  const handleStartPhrase = useCallback(
    (phrase: PracticePhrase, todayTargetBpm: number) => {
      startPhrasePractice(phrase, todayTargetBpm);
    },
    [startPhrasePractice],
  );

  const handleFinishPractice = useCallback(() => {
    beginResultEntry(randomUUID());
    setShowResultSheet(true);
  }, [beginResultEntry]);

  const handleSubmitResult = useCallback(
    async ({ bpm, result }: { bpm: number; result: "ok" | "partial" | "ng" }) => {
      if (!activePractice) return;
      try {
        await recordResultAsync({
          id: pendingAttemptId ?? randomUUID(),
          phraseId: activePractice.phrase.id,
          date: new Date().toISOString(),
          bpm,
          result,
        });
      } catch (error) {
        if (error instanceof PhraseNotFoundError) {
          Alert.alert("記録できません", "このフレーズは削除されています");
          setShowResultSheet(false);
          setActivePractice(null);
          return;
        }
        // 保存失敗はshowMutationErrorがAlertを表示済み。シートと練習状態は保持し再送できるようにする
        return;
      }
      setShowResultSheet(false);
      setActivePractice(null);
    },
    [activePractice, pendingAttemptId, recordResultAsync, setActivePractice],
  );

  const handleTryPreset = useCallback(() => {
    const preset = presets[0];
    if (!preset) return;
    loadVideo(preset.videoId, preset.title);
    addRecent({
      videoId: preset.videoId,
      title: preset.title,
      lastWatchedAt: new Date().toISOString(),
    });
  }, [presets, loadVideo, addRecent]);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 今日の練習メニュー */}
        <TodayMenuCard onStartPhrase={handleStartPhrase} onTryPreset={handleTryPreset} />

        {/* 練習中のフレーズ（今日の練習メニューから開始した場合のみ表示） */}
        {activePractice && (
          <View
            className="bg-surface-container-lowest flex-row items-center"
            style={[cardStyle, cardShadowStyle, { marginBottom: 16, gap: 12 }]}
          >
            <View
              className="items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: `${colors.tertiaryContainer}33`,
              }}
            >
              <Icon name="star" size={18} color={colors.tertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                className="text-body-md"
                style={{ color: colors.onSurface, fontWeight: "600" }}
                numberOfLines={1}
              >
                練習中: {activePractice.phrase.name}
              </Text>
              <Text
                className="text-label-sm"
                style={{ color: colors.onSurfaceVariant }}
              >
                今日の目標 {activePractice.todayTargetBpm} BPM
              </Text>
            </View>
            <Pressable
              onPress={handleFinishPractice}
              className="active:opacity-90"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: colors.primary,
              }}
              accessibilityRole="button"
            >
              <Text
                className="text-label-sm"
                style={{ color: colors.onPrimary, fontWeight: "700" }}
              >
                終了して記録
              </Text>
            </Pressable>
          </View>
        )}

        {/* URL Input Card */}
        <VideoLoaderCard
          value={urlInput}
          onChangeText={setUrlInput}
          onLoad={handleLoadVideo}
        />

        {/* Video Player (if loaded) */}
        {loadedVideoId && playerError !== null && (
          <View
            className="bg-surface-container-lowest items-center"
            style={[cardStyle, cardShadowStyle, { marginBottom: 16, gap: 12 }]}
          >
            <Icon name="error" size={28} color={colors.error} />
            <Text
              className="text-body-md text-center"
              style={{ color: colors.onSurface, fontWeight: "600" }}
            >
              この動画は再生できません
            </Text>
            <Text
              className="text-label-sm text-center"
              style={{ color: colors.onSurfaceVariant }}
            >
              {describePlayerError(playerError)}
            </Text>
            <Pressable
              onPress={clearVideo}
              className="active:opacity-90"
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: colors.primary,
              }}
              accessibilityRole="button"
            >
              <Text
                className="text-label-sm"
                style={{ color: colors.onPrimary, fontWeight: "700" }}
              >
                別の動画を読み込む
              </Text>
            </Pressable>
          </View>
        )}
        {loadedVideoId && playerError === null && (
          <VideoPlayerCard
            key={videoLoadNonce}
            ref={webViewRef}
            videoId={loadedVideoId}
            startSeconds={videoStartSeconds}
            initialRate={videoInitialRate}
            onTimeUpdate={setCurrentTime}
            onDurationReady={setDuration}
            onPlayerError={setPlayerError}
          />
        )}

        {/* Timer Card */}
        <PracticeTimerCard
          displaySeconds={displaySeconds}
          isTimerRunning={isTimerRunning}
          onToggleTimer={isTimerRunning ? stopPracticeTimer : startPracticeTimer}
          onSaveSession={() => void handleSaveSession()}
        />

        {/* Playback Rate Chips */}
        <PlaybackRateChips
          value={playbackRate}
          onChange={(rate: PlaybackRate) => {
            setPlaybackRate(rate);
            sendToPlayer({ action: "setRate", rate });
          }}
        />

        {/* AB Loop Card */}
        <ABLoopCard
          abLoop={abLoop}
          currentTime={currentTime}
          onSetPointA={() => setABLoop({ pointA: Math.floor(currentTime) })}
          onSetPointB={() => setABLoop({ pointB: Math.floor(currentTime) })}
          onToggleLoop={() => {
            if (!abLoop.enabled && !isValidLoopRange(abLoop)) {
              Alert.alert("エラー", "B点はA点より後に設定してください");
              return;
            }
            setABLoop({ enabled: !abLoop.enabled });
          }}
          onClear={clearABLoop}
          defaultBpm={metronomeBpm}
          onSavePhrase={handleSavePhrase}
        />

        {/* Bookmarks Card */}
        <BookmarksCard
          bookmarks={bookmarks}
          onAdd={handleAddBookmark}
          onRemove={removeBookmark}
        />

        {/* Metronome */}
        <MetronomeWidget />
      </ScrollView>
      <PhraseResultSheet
        visible={showResultSheet}
        phrase={activePractice?.phrase ?? null}
        todayTargetBpm={activePractice?.todayTargetBpm ?? 0}
        onClose={() => setShowResultSheet(false)}
        onSubmit={handleSubmitResult}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
