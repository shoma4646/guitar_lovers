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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Alert, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { useSharedValue } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { usePracticeStore, type PlaybackRate } from "@/stores/practice";
import { colors } from "@/shared/theme";
import { IconButton } from "@/shared/components/atoms/IconButton";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { useSavePracticePhrase } from "@/features/practice/api/useSavePracticePhrase";
import { useRecordPhraseResult } from "@/features/practice/api/useRecordPhraseResult";
import { useGraduatePracticePhrase } from "@/features/practice/api/useGraduatePracticePhrase";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { PhraseNotFoundError } from "@/shared/services/storage";
import { useRunAfterDismiss } from "@/shared/hooks/useRunAfterDismiss";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { useReminderPermissionPrompt } from "@/features/reminder/hooks/useReminderPermissionPrompt";
import { buildTodayMenu, resolveCurrentBpm } from "@/features/practice/lib/progression";
import { filterOpenMenuEntries, planAfterResult } from "@/features/practice/lib/afterResult";
import { summarizePhraseProgress } from "@/features/progress/lib/phraseProgress";
import { formatDuration } from "@/features/practice/lib/formatters";
import {
  applyPoint,
  isAtPhraseRange,
  isValidLoopRange,
  resolvePointTime,
} from "@/features/practice/lib/abLoop";
import { stepBpm } from "@/features/practice/lib/tempo";
import { useMetronomeEngine } from "@/features/practice/hooks/useMetronomeEngine";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";
import { useSaveTimerSession } from "@/features/practice/hooks/useSaveTimerSession";
import { useCloseVideo } from "@/features/practice/hooks/useCloseVideo";
import { usePausePlayerOnBlur } from "@/features/practice/hooks/usePausePlayerOnBlur";
import { useSyncPlayerLoop } from "@/features/practice/hooks/useSyncPlayerLoop";
import { useKeepAwakeWhileFocused } from "@/shared/hooks/useKeepAwakeWhileFocused";
import { useFitsOneScreen } from "@/shared/hooks/useFitsOneScreen";
import { SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";
import { useLocalDay } from "@/shared/hooks/useLocalDay";
import { localDayToDate } from "@/shared/lib/localDay";
import {
  PRACTICE_KEEP_AWAKE_TAG,
  shouldKeepAwakeDuringPractice,
} from "@/features/practice/lib/keepAwake";
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
import { VideoErrorCard } from "./VideoErrorCard";

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

  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const setABLoop = usePracticeStore((s) => s.setABLoop);
  const clearABLoop = usePracticeStore((s) => s.clearABLoop);
  const addBookmark = usePracticeStore((s) => s.addBookmark);
  const removeBookmark = usePracticeStore((s) => s.removeBookmark);
  const setPlaybackRate = usePracticeStore((s) => s.setPlaybackRate);
  const startPhrasePractice = usePracticeStore((s) => s.startPhrasePractice);
  const restorePhraseSettings = usePracticeStore((s) => s.restorePhraseSettings);
  const startPracticeTimer = usePracticeStore((s) => s.startPracticeTimer);
  const stopPracticeTimer = usePracticeStore((s) => s.stopPracticeTimer);
  const resetPracticeTimer = usePracticeStore((s) => s.resetPracticeTimer);
  const videoStartSeconds = usePracticeStore((s) => s.videoStartSeconds);
  const videoInitialRate = usePracticeStore((s) => s.videoInitialRate);
  const videoLoadNonce = usePracticeStore((s) => s.videoLoadNonce);
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
  const { mutateAsync: savePhraseAsync } = useSavePracticePhrase();
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
  const isSubmittingResultRef = useRef(false);
  const [phraseElapsedSeconds, setPhraseElapsedSeconds] = useState(0);
  const playerError = usePracticeStore((s) => s.playerError);
  const setPlayerError = usePracticeStore((s) => s.setPlayerError);
  const pendingAttemptId = usePracticeStore((s) => s.pendingAttemptId);
  const beginResultEntry = usePracticeStore((s) => s.beginResultEntry);

  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAllPhrases, setShowAllPhrases] = useState(false);
  const { schedule: runAfterMenuDismissed, flush: handleMenuDismissed } = useRunAfterDismiss();

  const sendToPlayer = useCallback((cmd: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(cmd));
  }, []);
  const isPlayerMounted = useCallback(() => webViewRef.current !== null, []);
  usePausePlayerOnBlur(sendToPlayer, isPlayerMounted);
  const resendLoopToPlayer = useSyncPlayerLoop(abLoop, sendToPlayer);
  useKeepAwakeWhileFocused(
    shouldKeepAwakeDuringPractice({ hasActivePhrase: activePractice !== null, metronomeEnabled }),
    PRACTICE_KEEP_AWAKE_TAG,
  );

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

  // 再生位置の高頻度な値（onTimeUpdateは再生中200msごと）はここに集約する。
  // currentTimeRef=JS側の同期読み取り用、currentTimeShared=シークバー描画用で、
  // どちらもZustandを経由しないためツリー全体の再レンダリングを起こさない
  const currentTimeRef = useRef(0);
  const currentTimeShared = useSharedValue(0);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      currentTimeShared.value = time;
    },
    [currentTimeShared],
  );

  const handlePlayerReady = useCallback(
    (videoDuration: number) => {
      setDuration(videoDuration);
      resendLoopToPlayer();
    },
    [setDuration, resendLoopToPlayer],
  );

  const handleScrubStart = useCallback(() => {
    sendToPlayer({ action: "pause" });
  }, [sendToPlayer]);

  const handleScrubEnd = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      currentTimeShared.value = time;
      sendToPlayer({ action: "seek", time });
      sendToPlayer({ action: "play" });
    },
    [currentTimeShared, sendToPlayer],
  );

  const handleScrubCancel = useCallback(() => {
    // ドラッグの異常終了。位置は確定させず一時停止だけ解除する
    sendToPlayer({ action: "play" });
  }, [sendToPlayer]);

  const { saveTimerSession, isSaving: isSavingSession } = useSaveTimerSession({
    seconds: displaySeconds,
    videoId: loadedVideoId,
    onSaved: resetPracticeTimer,
  });

  const handleAddBookmark = useCallback(() => {
    addBookmark({
      id: randomUUID(),
      time: Math.floor(currentTimeRef.current),
      label: `ブックマーク ${bookmarks.length + 1}`,
      createdAt: new Date().toISOString(),
    });
  }, [addBookmark, bookmarks.length]);

  const handleSavePhrase = useCallback(
    async (input: SavePhraseInput) => {
      if (!loadedVideoId) {
        Alert.alert("エラー", "動画を読み込んでから保存してください");
        throw new Error("動画が読み込まれていない");
      }
      if (abLoop.pointA === null || abLoop.pointB === null || !isValidLoopRange(abLoop)) {
        Alert.alert("エラー", "B点はA点より後に設定してください");
        throw new Error("区間が不正");
      }
      const now = new Date().toISOString();
      await savePhraseAsync({
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
      });
      setShowSavePhrase(false);
      Alert.alert("保存しました", `「${input.name}」を今日の練習メニューに追加しました`, [
        { text: "OK", onPress: () => void promptReminderPermission() },
      ]);
    },
    [loadedVideoId, videoTitle, abLoop, playbackRate, savePhraseAsync, promptReminderPermission],
  );

  // 確認ダイアログを経由せずフレーズ練習を開始する。「記録して次の1本へ」など、直前に
  // recordResultAsyncで保存済みで未保存の記録が無いことが分かっている遷移から使う
  const startPhraseDirectly = useCallback(
    (phrase: PracticePhrase, startBpm: number) => {
      startPhrasePractice(phrase, startBpm);
      // 読み込み前の一覧はScrollViewだが、読み込み後は同じ画面のまま切り替わるため
      // 一覧を開いていた場合に備えて先頭へ戻しておく（読み込み後は無関係でno-op）
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
    [startPhrasePractice],
  );

  const handleStartPhrase = useCallback(
    (phrase: PracticePhrase, startBpm: number) => {
      // 今練習中のフレーズを選び直したときは、回数を残したまま区間・速度・BPMだけを戻す
      if (activePractice?.phrase.id === phrase.id) {
        restorePhraseSettings(phrase, startBpm);
        return;
      }
      confirmSwitch(() => startPhraseDirectly(phrase, startBpm));
    },
    [activePractice, confirmSwitch, restorePhraseSettings, startPhraseDirectly],
  );

  const handleFinishPractice = useCallback(() => {
    beginResultEntry(randomUUID());
    setPhraseElapsedSeconds(
      activePractice ? Math.max(0, Math.floor((Date.now() - activePractice.startedAt) / 1000)) : 0,
    );
    setShowResultSheet(true);
  }, [activePractice, beginResultEntry]);

  const localDay = useLocalDay();
  const fitsOneScreen = useFitsOneScreen();
  const todayMenu = useMemo(
    () => buildTodayMenu(allPhrases, allPhraseAttempts, localDayToDate(localDay)),
    [allPhrases, allPhraseAttempts, localDay],
  );

  // 卒業済みに加え、当日すでに目標へ到達したフレーズも除いた「今日まだ残っている」メニュー。
  // ヘッダーの「残りN本」表示と「次の1本へ」の候補選びの両方をこの1つの集合に揃える
  const openMenuEntries = useMemo(() => filterOpenMenuEntries(todayMenu), [todayMenu]);

  const handleSubmitResult = useCallback(
    async ({ result }: { result: "ok" | "partial" | "ng" }, action: "next" | "finish") => {
      // stateの更新は次のレンダーまで反映されないため、同一イベントループ内の二度押しは
      // refで止める。押し分けられた2つのボタンから同時に走るのを防ぐ
      if (!activePractice || isSubmittingResultRef.current) return;
      isSubmittingResultRef.current = true;
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
          // repsは正の整数のみ保存できる（0を渡すと記録の保存自体が失敗する）
          ...(activePractice.completedReps > 0 ? { reps: activePractice.completedReps } : {}),
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
        const plan = planAfterResult({ phrase, attempts: allPhraseAttempts, attempt, todayMenu });
        if (plan.graduatedAt) {
          graduatePhrase({ id: phrase.id, graduatedAt: plan.graduatedAt });
        }
        setShowResultSheet(false);
        // 保存済みなので、次のフレーズへ進む前に完了させる。先に完了させないと、直後の
        // 遷移がconfirmSwitchの「未保存の記録」として誤検知したり、再送時に同じattempt IDを
        // 使い回して今回の記録を上書きしてしまう。
        // 記録した本人が今も練習中のときだけ消す（この後に別フレーズが始まっていたら消さない）
        if (usePracticeStore.getState().activePhrasePractice?.phrase.id === phrase.id) {
          setActivePractice(null);
        }

        if (action === "next" && plan.next) {
          // 直前に保存が成功しており未保存の記録は無いため、確認ダイアログを経由せず開始する
          startPhraseDirectly(plan.next.phrase, plan.next.startBpm);
        }
      } finally {
        isSubmittingResultRef.current = false;
        setIsSubmittingResult(false);
      }
    },
    [
      activePractice,
      pendingAttemptId,
      recordResultAsync,
      graduatePhrase,
      setActivePractice,
      allPhraseAttempts,
      metronomeBpm,
      todayMenu,
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

  const handleCloseVideo = useCloseVideo();

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

  const handleSeekBookmark = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      currentTimeShared.value = time;
      sendToPlayer({ action: "seek", time });
    },
    [currentTimeShared, sendToPlayer],
  );

  const handleSetPoint = useCallback(
    (point: "A" | "B") => {
      setABLoop(applyPoint(abLoop, point, resolvePointTime(point, currentTimeRef.current, duration)));
    },
    [abLoop, duration, setABLoop],
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
      onSaveSession={() => void saveTimerSession()}
      isSavingSession={isSavingSession}
      hasVideo={loadedVideoId !== null}
      bookmarks={bookmarks}
      onAddBookmark={handleAddBookmark}
      onRemoveBookmark={removeBookmark}
      onSeekBookmark={handleSeekBookmark}
      onOpenAddVideo={() => {
        runAfterMenuDismissed(onOpenAddVideo);
        setShowMenu(false);
      }}
      onDismissed={handleMenuDismissed}
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
            <TodayPickCard
              onStartPhrase={handleStartPhrase}
              onTryPreset={handleTryPreset}
              onOpenAddVideo={onOpenAddVideo}
            />
            <TodayPhraseRows
              onStartPhrase={handleStartPhrase}
              onOpenAllPhrases={() => setShowAllPhrases(true)}
            />
          </View>
        </ScrollView>

        <AllPhrasesSheet
          visible={showAllPhrases}
          onClose={() => setShowAllPhrases(false)}
          onStartPhrase={(phrase, startBpm) => {
            setShowAllPhrases(false);
            handleStartPhrase(phrase, startBpm);
          }}
        />

        {menuSheet}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "space-between" }}>
      <ScrollWhenOverflow enabled={!fitsOneScreen}>
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
            <VideoErrorCard code={playerError} />
          ) : (
            <>
              <VideoPlayerCard
                key={videoLoadNonce}
                ref={webViewRef}
                videoId={loadedVideoId}
                startSeconds={videoStartSeconds}
                initialRate={videoInitialRate}
                onTimeUpdate={handleTimeUpdate}
                onDurationReady={handlePlayerReady}
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
                isAtActivePhraseRange={
                  activePractice !== null && isAtPhraseRange(abLoop, activePractice.phrase)
                }
                onTapPoint={handleTapPoint}
                onSetPoint={handleSetPoint}
                onScrubStart={handleScrubStart}
                onScrubEnd={handleScrubEnd}
                onScrubCancel={handleScrubCancel}
                bookmarkCount={bookmarks.length}
                onAddBookmark={handleAddBookmark}
                onOpenSavePhrase={() => setShowSavePhrase(true)}
                hasNoPhrases={allPhrases.length === 0}
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
      </ScrollWhenOverflow>

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

/** 1画面に収まらないときだけ中身をスクロールさせる。練習中バーをこの外に置き、下端に固定したまま届くようにする */
function ScrollWhenOverflow({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    // ScrollViewは枠外を切り取るため、動画のフルブリード表示が欠けないよう画面の横paddingをScrollView内側へ移す
    <ScrollView
      testID="practice-overflow-scroll"
      style={{ flex: 1, marginHorizontal: -SCREEN_HORIZONTAL_PADDING }}
      contentContainerStyle={{ paddingHorizontal: SCREEN_HORIZONTAL_PADDING }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
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
