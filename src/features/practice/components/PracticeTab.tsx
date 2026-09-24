/**
 * 練習タブ
 *
 * 動画読み込み前は今日の1本＋今日のフレーズ一覧、読み込み後は動画プレイヤー・操作パネル
 * （シークバー・ABループ・BPM・メトロノーム）・練習中バーの1画面を束ねるコンテナ。
 * WebViewの再生制御（sendToPlayer）はここで一元管理し、子コンポーネントへはpropsとして渡す。
 * メトロノームのエンジン（useMetronomeEngine）はloadedVideoIdの有無に関わらず常時呼び出す。
 * 動画エラーでPracticeControlPanelごと消えても音が止まらないようにするためと、
 * 動画読み込み前でもPracticeMenuSheet経由でメトロノーム単体を使えるようにするため。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { useSharedValue } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { usePracticeStore, type PlaybackRate } from "@/stores/practice";
import { colors } from "@/shared/theme";
import { Icon } from "@/shared/components/atoms/Icon";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { Card } from "@/shared/components/molecules/Card";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { useSavePracticePhrase } from "@/features/practice/api/useSavePracticePhrase";
import { useRecordPhraseResult } from "@/features/practice/api/useRecordPhraseResult";
import { useGraduatePracticePhrase } from "@/features/practice/api/useGraduatePracticePhrase";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { PhraseNotFoundError } from "@/shared/services/storage";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { useReminderPermissionPrompt } from "@/features/reminder/hooks/useReminderPermissionPrompt";
import { buildTodayMenu, resolveCurrentBpm, resolveGraduatedAt } from "@/features/practice/lib/progression";
import { resolveTodayProgress } from "@/features/practice/lib/todayCompletion";
import { summarizePhraseProgress } from "@/features/progress/lib/phraseProgress";
import { describePlayerError } from "@/features/practice/lib/playerError";
import { formatDuration } from "@/features/practice/lib/formatters";
import { applyPoint, isValidLoopRange, shouldLoopBack } from "@/features/practice/lib/abLoop";
import { stepBpm } from "@/features/practice/lib/tempo";
import { useMetronomeEngine } from "@/features/practice/hooks/useMetronomeEngine";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";
import { VideoPlayerCard } from "./VideoPlayerCard";
import { PlaybackRateChips } from "./PlaybackRateChips";
import { PracticeControlPanel } from "./PracticeControlPanel";
import { SavePhraseSheet, type SavePhraseInput } from "./SavePhraseSheet";
import { TodayPickCard } from "./TodayPickCard";
import { TodayPhraseRows } from "./TodayPhraseRows";
import { AllPhrasesSheet } from "./AllPhrasesSheet";
import { PhraseResultSheet } from "./PhraseResultSheet";
import { PracticeSessionBar } from "./PracticeSessionBar";
import { PracticeMenuSheet } from "./PracticeMenuSheet";

type Props = {
  /** ヘッダーメニューの「別の動画を開く」から呼ぶ。AddVideoSheetの開閉はPracticeScreen側で持つ */
  onOpenAddVideo: () => void;
};

export function PracticeTab({ onOpenAddVideo }: Props) {
  const loadedVideoId = usePracticeStore((s) => s.loadedVideoId);
  const videoTitle = usePracticeStore((s) => s.videoTitle);
  const elapsedSeconds = usePracticeStore((s) => s.elapsedSeconds);
  const practiceStartTime = usePracticeStore((s) => s.practiceStartTime);
  const abLoop = usePracticeStore((s) => s.abLoop);
  const bookmarks = usePracticeStore((s) => s.bookmarks);
  const playbackRate = usePracticeStore((s) => s.playbackRate);
  const setDuration = usePracticeStore((s) => s.setDuration);
  const duration = usePracticeStore((s) => s.duration);
  const setCurrentTime = usePracticeStore((s) => s.setCurrentTime);

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
  // 「今日の練習メニュー」から開始した練習中フレーズ。サブタブ切替をまたいで保持するためストアで管理する
  const activePractice = usePracticeStore((s) => s.activePhrasePractice);
  const setActivePractice = usePracticeStore((s) => s.setActivePhrasePractice);
  const incrementCompletedReps = usePracticeStore((s) => s.incrementCompletedReps);
  const decrementCompletedReps = usePracticeStore((s) => s.decrementCompletedReps);
  const setMetronomeBpm = usePracticeStore((s) => s.setMetronomeBpm);
  const setMetronomeEnabled = usePracticeStore((s) => s.setMetronomeEnabled);
  // 動画読み込み前後・PracticeScreenのヘッダーからも同じシートを開けるよう、開閉状態はストアで持つ
  const showMenu = usePracticeStore((s) => s.toolsSheetOpen);
  const setShowMenu = usePracticeStore((s) => s.setToolsSheetOpen);

  const router = useRouter();
  const { mutate: addRecent } = useAddRecentVideo();
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const { mutate: savePhrase } = useSavePracticePhrase();
  const { mutateAsync: recordResultAsync } = useRecordPhraseResult();
  const { mutate: graduatePhrase } = useGraduatePracticePhrase();
  const { data: allPhraseAttempts = [] } = usePhraseAttempts();
  const { data: allPhrases = [] } = usePracticePhrases();
  const { data: presets = [] } = useVideoPresets();
  const promptReminderPermission = useReminderPermissionPrompt();
  const confirmSwitch = useConfirmPhraseSwitch();
  const { bpm: metronomeBpm, enabled: metronomeEnabled, activeBeat, beatsPerBar } = useMetronomeEngine();

  const [showResultSheet, setShowResultSheet] = useState(false);
  const [showSavePhrase, setShowSavePhrase] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [phraseElapsedSeconds, setPhraseElapsedSeconds] = useState(0);
  const playerError = usePracticeStore((s) => s.playerError);
  const setPlayerError = usePracticeStore((s) => s.setPlayerError);
  const pendingAttemptId = usePracticeStore((s) => s.pendingAttemptId);
  const beginResultEntry = usePracticeStore((s) => s.beginResultEntry);

  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAllPhrases, setShowAllPhrases] = useState(false);

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

  // 再生位置の高頻度な値（onTimeUpdateは200msごと）はここに集約する。
  // currentTimeRef=JS側の同期読み取り用、currentTimeShared=シークバー描画用で、
  // どちらもZustandを経由しないためツリー全体の再レンダリングを起こさない
  const currentTimeRef = useRef(0);
  const currentTimeShared = useSharedValue(0);
  const abLoopRef = useRef(abLoop);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    abLoopRef.current = abLoop;
  }, [abLoop]);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      currentTimeShared.value = time;

      // ドラッグ中はユーザーのシークとループ巻き戻しが競合するため判定自体を止める
      if (!isScrubbingRef.current && shouldLoopBack(time, abLoopRef.current)) {
        const target = abLoopRef.current.pointA;
        if (target !== null) sendToPlayer({ action: "seek", time: target });
      }

      // ストアのcurrentTimeはこのタブでは購読せず（毎秒の再レンダリングを避けるため）書き込みだけ残す
      setCurrentTime(time);
    },
    [currentTimeShared, sendToPlayer, setCurrentTime],
  );

  const handleScrubStart = useCallback(() => {
    sendToPlayer({ action: "pause" });
  }, [sendToPlayer]);

  const handleScrubEnd = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      currentTimeShared.value = time;
      setCurrentTime(time);
      sendToPlayer({ action: "seek", time });
      sendToPlayer({ action: "play" });
    },
    [currentTimeShared, sendToPlayer, setCurrentTime],
  );

  const handleScrubCancel = useCallback(() => {
    // ドラッグの異常終了。位置は確定させず一時停止だけ解除する
    sendToPlayer({ action: "play" });
  }, [sendToPlayer]);

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
      time: Math.floor(currentTimeRef.current),
      label: `ブックマーク ${bookmarks.length + 1}`,
      createdAt: new Date().toISOString(),
    });
  }, [addBookmark, bookmarks.length]);

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
          onSuccess: () => {
            setShowSavePhrase(false);
            Alert.alert("保存しました", `「${input.name}」を今日の練習メニューに追加しました`, [
              { text: "OK", onPress: () => void promptReminderPermission() },
            ]);
          },
        },
      );
    },
    [loadedVideoId, videoTitle, abLoop, playbackRate, savePhrase, promptReminderPermission],
  );

  // 確認ダイアログを経由せずフレーズ練習を開始する。「記録して次の1本へ」など、直前に
  // recordResultAsyncで保存済みで未保存の記録が無いことが分かっている遷移から使う
  const startPhraseDirectly = useCallback(
    (phrase: PracticePhrase, todayTargetBpm: number) => {
      startPhrasePractice(phrase, todayTargetBpm);
      // 読み込み前の一覧はScrollViewだが、読み込み後は同じ画面のまま切り替わるため
      // 一覧を開いていた場合に備えて先頭へ戻しておく（読み込み後は無関係でno-op）
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
    [startPhrasePractice],
  );

  const handleStartPhrase = useCallback(
    (phrase: PracticePhrase, todayTargetBpm: number) => {
      // 今練習中のフレーズを選び直しただけなら確認不要
      if (activePractice?.phrase.id === phrase.id) {
        startPhraseDirectly(phrase, todayTargetBpm);
        return;
      }
      confirmSwitch(() => startPhraseDirectly(phrase, todayTargetBpm));
    },
    [activePractice, confirmSwitch, startPhraseDirectly],
  );

  const handleFinishPractice = useCallback(() => {
    beginResultEntry(randomUUID());
    setPhraseElapsedSeconds(
      activePractice ? Math.max(0, Math.floor((Date.now() - activePractice.startedAt) / 1000)) : 0,
    );
    setShowResultSheet(true);
  }, [activePractice, beginResultEntry]);

  const todayMenu = useMemo(
    () => buildTodayMenu(allPhrases, allPhraseAttempts),
    [allPhrases, allPhraseAttempts],
  );

  // 卒業済みに加え、当日すでに目標へ到達したフレーズも除いた「今日まだ残っている」メニュー。
  // ヘッダーの「残りN本」表示と「次の1本へ」の候補選びの両方をこの1つの集合に揃える
  const openMenuEntries = useMemo(() => {
    const now = new Date();
    return todayMenu.filter((entry) => {
      if (entry.priority === "graduated") return false;
      const phraseAttempts = allPhraseAttempts.filter((a) => a.phraseId === entry.phrase.id);
      return !resolveTodayProgress(entry.phrase, phraseAttempts, now).reached;
    });
  }, [todayMenu, allPhraseAttempts]);

  const handleSubmitResult = useCallback(
    async ({ result }: { result: "ok" | "partial" | "ng" }, action: "next" | "finish") => {
      if (!activePractice || isSubmittingResult) return;
      setIsSubmittingResult(true);
      try {
        const date = new Date().toISOString();
        const bpm = metronomeBpm;
        const attempt: PhraseAttempt = {
          id: pendingAttemptId ?? randomUUID(),
          phraseId: activePractice.phrase.id,
          date,
          bpm,
          result,
          // 画面に出している回数をそのまま残す。0回だけ欠落すると表示と記録が食い違う
          reps: activePractice.completedReps,
        };
        try {
          await recordResultAsync(attempt);
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
        const { phrase } = activePractice;
        if (result === "ok" && bpm >= phrase.targetBpm && !phrase.graduatedAt) {
          const phraseAttempts = allPhraseAttempts.filter((a) => a.phraseId === phrase.id);
          // 到達済みフレーズの卒業日が再記録のたびに今日へ前進しないよう、記録から最初の到達日を再計算する
          const graduatedAt = resolveGraduatedAt(phrase, [...phraseAttempts, attempt]) ?? date;
          graduatePhrase({ id: phrase.id, graduatedAt });
        }
        setShowResultSheet(false);
        // 保存済みなので、次のフレーズへ進む前に完了させる。先に完了させないと、直後の
        // 遷移がconfirmSwitchの「未保存の記録」として誤検知したり、再送時に同じattempt IDを
        // 使い回して今回の記録を上書きしてしまう
        setActivePractice(null);

        if (action === "next") {
          const nextEntry = openMenuEntries.find((entry) => entry.phrase.id !== phrase.id);
          if (nextEntry) {
            const nextPhraseAttempts = allPhraseAttempts.filter(
              (a) => a.phraseId === nextEntry.phrase.id,
            );
            // TodayPhraseRows等と同じ「今日の記録を除いた目標」に揃える（buildTodayMenuの
            // todayTargetBpmは当日の記録を含むため、そのまま使うと導線ごとに値がずれる）
            const { targetBeforeToday } = resolveTodayProgress(nextEntry.phrase, nextPhraseAttempts, new Date());
            // 直前に保存が成功しており未保存の記録は無いため、確認ダイアログを経由せず開始する
            startPhraseDirectly(nextEntry.phrase, targetBeforeToday);
          }
        }
      } finally {
        setIsSubmittingResult(false);
      }
    },
    [
      activePractice,
      isSubmittingResult,
      pendingAttemptId,
      recordResultAsync,
      graduatePhrase,
      setActivePractice,
      allPhraseAttempts,
      metronomeBpm,
      openMenuEntries,
      startPhraseDirectly,
    ],
  );

  const handleTryPreset = useCallback(() => {
    const preset = presets[0];
    if (!preset) return;
    confirmSwitch(() => {
      loadVideo(preset.videoId, preset.title);
      addRecent({
        videoId: preset.videoId,
        title: preset.title,
        lastWatchedAt: new Date().toISOString(),
      });
    });
  }, [presets, confirmSwitch, loadVideo, addRecent]);

  const handleCloseVideo = useCallback(() => {
    confirmSwitch(() => {
      setShowMenu(false);
      clearVideo();
    });
  }, [confirmSwitch, setShowMenu, clearVideo]);

  const handleTapPoint = useCallback(
    (point: "A" | "B") => {
      const time = point === "A" ? abLoop.pointA : abLoop.pointB;
      if (time === null) return;
      // WebView側のonTimeUpdate（約200ms間隔）を待たず、シーク直後からシークバー表示を正しい位置にする
      currentTimeRef.current = time;
      currentTimeShared.value = time;
      sendToPlayer({ action: "seek", time });
    },
    [abLoop, currentTimeShared, sendToPlayer],
  );

  const handleSetPoint = useCallback(
    (point: "A" | "B") => {
      setABLoop(applyPoint(abLoop, point, Math.floor(currentTimeRef.current)));
    },
    [abLoop, setABLoop],
  );

  const handleToggleLoop = useCallback(() => {
    if (!isValidLoopRange(abLoop)) return;
    setABLoop({ enabled: !abLoop.enabled });
  }, [abLoop, setABLoop]);

  const handleStepMetronomeBpm = useCallback(
    (delta: number) => setMetronomeBpm(stepBpm(metronomeBpm, delta)),
    [metronomeBpm, setMetronomeBpm],
  );

  const handleToggleMetronome = useCallback(
    () => setMetronomeEnabled(!metronomeEnabled),
    [metronomeEnabled, setMetronomeEnabled],
  );

  const activePhraseAttempts = useMemo(
    () =>
      activePractice
        ? allPhraseAttempts.filter((a) => a.phraseId === activePractice.phrase.id)
        : [],
    [activePractice, allPhraseAttempts],
  );

  const resultSheetProgress = useMemo(
    () => (activePractice ? summarizePhraseProgress(activePractice.phrase, activePhraseAttempts) : null),
    [activePractice, activePhraseAttempts],
  );

  const panelPhraseProgress = activePractice
    ? {
        lastReachedBpm: resolveCurrentBpm(activePractice.phrase.currentBpm, activePhraseAttempts),
        bpmToGraduate: Math.max(0, activePractice.phrase.targetBpm - metronomeBpm),
      }
    : null;

  const remainingCount = openMenuEntries.length;
  const headerTitle = activePractice?.phrase.name ?? (videoTitle || "動画を再生中");
  const headerSubtitle = activePractice ? `今日の1本・残り${remainingCount}本` : null;

  const menuSheet = (
    <PracticeMenuSheet
      visible={showMenu}
      onClose={() => setShowMenu(false)}
      activePhraseId={activePractice?.phrase.id ?? null}
      onSelectPhrase={handleStartPhrase}
      metronomeBpm={metronomeBpm}
      metronomeEnabled={metronomeEnabled}
      metronomeActiveBeat={activeBeat}
      metronomeBeatsPerBar={beatsPerBar}
      onStepMetronomeBpm={handleStepMetronomeBpm}
      onToggleMetronome={handleToggleMetronome}
      displaySeconds={displaySeconds}
      isTimerRunning={isTimerRunning}
      onToggleTimer={isTimerRunning ? stopPracticeTimer : startPracticeTimer}
      onSaveSession={() => void handleSaveSession()}
      hasVideo={loadedVideoId !== null}
      bookmarks={bookmarks}
      onAddBookmark={handleAddBookmark}
      onRemoveBookmark={removeBookmark}
      onOpenAddVideo={() => {
        setShowMenu(false);
        onOpenAddVideo();
      }}
      onCloseVideo={handleCloseVideo}
    />
  );

  if (!loadedVideoId) {
    return (
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 12 }}>
            <TodayPickCard onStartPhrase={handleStartPhrase} onTryPreset={handleTryPreset} />
            <TodayPhraseRows
              onStartPhrase={handleStartPhrase}
              onOpenAllPhrases={() => setShowAllPhrases(true)}
            />
          </View>
        </ScrollView>

        <AllPhrasesSheet
          visible={showAllPhrases}
          onClose={() => setShowAllPhrases(false)}
          onStartPhrase={(phrase, todayTargetBpm) => {
            setShowAllPhrases(false);
            handleStartPhrase(phrase, todayTargetBpm);
          }}
        />

        {menuSheet}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "space-between" }}>
      <View style={{ gap: 10 }}>
        <View style={styles.header}>
          <IconButton name="menu" accessibilityLabel="メニューを開く" onPress={() => setShowMenu(true)} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {headerSubtitle && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {headerSubtitle}
              </Text>
            )}
          </View>
          <Text style={styles.headerTimer}>{formatDuration(displaySeconds)}</Text>
          <IconButton name="tune" accessibilityLabel="チューナーを開く" onPress={() => router.push("/(tabs)/tuner")} />
          <IconButton name="settings" accessibilityLabel="設定を開く" onPress={() => router.push("/settings")} />
        </View>

        {playerError !== null ? (
          <Card style={{ alignItems: "center", gap: 12 }}>
            <Icon name="error" size={28} color={colors.error} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.onSurface, textAlign: "center" }}>
              この動画は再生できません
            </Text>
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, textAlign: "center" }}>
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
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onPrimary }}>
                別の動画を読み込む
              </Text>
            </Pressable>
          </Card>
        ) : (
          <>
            <VideoPlayerCard
              key={videoLoadNonce}
              ref={webViewRef}
              videoId={loadedVideoId}
              startSeconds={videoStartSeconds}
              initialRate={videoInitialRate}
              onTimeUpdate={handleTimeUpdate}
              onDurationReady={setDuration}
              onPlayerError={setPlayerError}
            />

            <PlaybackRateChips
              value={playbackRate}
              onChange={(rate: PlaybackRate) => {
                setPlaybackRate(rate);
                sendToPlayer({ action: "setRate", rate });
              }}
            />

            <PracticeControlPanel
              abLoop={abLoop}
              currentTimeShared={currentTimeShared}
              duration={duration}
              onToggleLoop={handleToggleLoop}
              onClearLoop={clearABLoop}
              onTapPoint={handleTapPoint}
              onSetPoint={handleSetPoint}
              onScrubStart={handleScrubStart}
              onScrubEnd={handleScrubEnd}
              onScrubCancel={handleScrubCancel}
              scrubbingRef={isScrubbingRef}
              bookmarkCount={bookmarks.length}
              onAddBookmark={handleAddBookmark}
              onOpenSavePhrase={() => setShowSavePhrase(true)}
              metronomeBpm={metronomeBpm}
              metronomeEnabled={metronomeEnabled}
              metronomeActiveBeat={activeBeat}
              metronomeBeatsPerBar={beatsPerBar}
              onStepMetronomeBpm={handleStepMetronomeBpm}
              onToggleMetronome={handleToggleMetronome}
              phraseProgress={panelPhraseProgress}
            />
          </>
        )}
      </View>

      {activePractice && (
        <PracticeSessionBar
          practice={activePractice}
          metronomeBpm={metronomeBpm}
          onIncrement={incrementCompletedReps}
          onDecrement={decrementCompletedReps}
          onFinish={handleFinishPractice}
        />
      )}

      <PhraseResultSheet
        visible={showResultSheet}
        phrase={activePractice?.phrase ?? null}
        bpm={metronomeBpm}
        progress={resultSheetProgress}
        phraseElapsedSeconds={phraseElapsedSeconds}
        completedReps={activePractice?.completedReps ?? 0}
        onChangeCompletedReps={(delta) => (delta > 0 ? incrementCompletedReps() : decrementCompletedReps())}
        isSubmitting={isSubmittingResult}
        onClose={() => setShowResultSheet(false)}
        onSubmit={handleSubmitResult}
      />

      {menuSheet}

      <SavePhraseSheet
        visible={showSavePhrase}
        onClose={() => setShowSavePhrase(false)}
        defaultBpm={metronomeBpm}
        onSave={handleSavePhrase}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    // 画面の横paddingはPracticeScreenのScreenFrameが担うため、ここでは付けない
    paddingBottom: 32,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  headerTimer: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
    marginRight: 4,
  },
});
