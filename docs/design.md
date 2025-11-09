# React NativeからFlutterへの移行計画

## 現在のアプリケーション概要

### プロジェクト名
Guitar Lovers - ギター愛好家向けアプリケーション

### 技術スタック(現在)
- **フレームワーク**: React Native + Expo
- **ルーティング**: expo-router
- **UI**: React Nativeのコアコンポーネント + lucide-react-native
- **主要ライブラリ**:
  - expo-av: オーディオ録音
  - react-native-youtube-iframe: YouTube動画再生
  - react-native-gesture-handler: ジェスチャー処理
  - pitchy: 音高検出(未使用の可能性)

### 機能一覧

#### 1. チューナー機能 (tuner.tsx)
- **目的**: ギターのチューニング支援
- **主要機能**:
  - マイク入力による音程検出
  - 現在の音名表示
  - セント単位のずれ表示
  - チューニングプリセット切り替え(Standard, Half Step Down, Drop D)
- **技術要件**:
  - オーディオ録音権限
  - リアルタイム音声解析
  - 周波数解析

#### 2. 練習機能 (practice.tsx)
- **目的**: YouTube動画を使った練習支援
- **主要機能**:
  - YouTube URL入力と動画読み込み
  - 再生/一時停止コントロール
  - 再生速度調整(0.5x ~ 2.0x)
  - 10秒戻し/送り
  - ABループ再生(ループ開始・終了点設定)
  - シークバーによる位置調整
  - 再生時間表示
- **技術要件**:
  - YouTube IFrame API
  - 動画埋め込み
  - 精密な再生制御

#### 3. 練習記録機能 (history.dart)
- **目的**: 練習履歴の管理とモチベーション維持
- **主要機能**:
  - 練習セッションの記録（日時、時間、練習内容）
  - 練習時間の統計グラフ（週次・月次）
  - 練習履歴一覧表示
  - 練習記録のSNSシェア機能
  - ローカルストレージに保存
- **技術要件**:
  - shared_preferences: データ永続化
  - fl_chart: グラフ表示
  - share_plus: SNSシェア機能
  - リスト表示

#### 4. ニュース機能 (news.tsx)
- **目的**: ギター関連ニュース表示
- **主要機能**:
  - ニュース記事一覧表示
  - カテゴリ・日付表示
  - 記事サムネイル表示
  - Pull to Refresh
  - モックデータ使用
- **技術要件**:
  - 画像表示
  - リスト表示
  - 将来的にバックエンド連携が必要

### UI/UXデザイン
- **カラースキーム**:
  - 背景色: #1a1a1a (ダークテーマ)
  - アクセントカラー: #4CAF50 (緑)
  - セカンダリ背景: #262626, #333
  - テキスト: #fff, #888, #ccc
- **ナビゲーション**: ボトムタブナビゲーション(4タブ)
- **アイコン**: lucide-react-native

---

## Flutter移行計画

### 移行の目的
1. パフォーマンスの向上
2. ネイティブ機能へのアクセス改善
3. 単一コードベースでのiOS/Android対応
4. より洗練されたUI/UX

### 技術スタック(移行後)

#### コアフレームワーク
- **Flutter**: 最新安定版
- **Dart**: 最新安定版

#### 状態管理
- **Riverpod**: 推奨される状態管理ライブラリ

#### ルーティング
- **go_router**: 宣言的ルーティング

#### UI/デザイン
- **Material Design 3**: Flutterのデフォルトデザインシステム
- **Google Fonts**: フォント管理
- **flutter_svg**: SVGアイコン対応

#### 機能別パッケージ

**チューナー機能**:
- `permission_handler`: マイク権限管理
- `record`: オーディオ録音
- `fftea` または `flutter_audio_capture`: 音声解析
- `pitch_detector_dart`: 音高検出

**練習機能(YouTube)**:
- `youtube_player_flutter`: YouTube動画再生
- `flutter_hooks`: 状態管理補助

**画像・メディア**:
- `cached_network_image`: 画像キャッシング
- `image_picker`: 画像選択(将来的な投稿機能用)

**UI/UX**:
- `flutter_animate`: アニメーション
- `shimmer`: ローディング効果

**その他**:
- `url_launcher`: 外部リンク
- `shared_preferences`: ローカルストレージ

### プロジェクト構造

```
lib/
├── main.dart                   # エントリーポイント
├── app/
│   ├── router.dart             # ルーティング設定
│   └── theme.dart              # テーマ設定
├── features/
│   ├── tuner/
│   │   ├── presentation/
│   │   │   ├── tuner_screen.dart
│   │   │   └── widgets/
│   │   ├── domain/
│   │   │   └── models/
│   │   └── data/
│   │       └── services/
│   ├── practice/
│   │   ├── presentation/
│   │   │   ├── practice_screen.dart
│   │   │   └── widgets/
│   │   ├── domain/
│   │   │   └── models/
│   │   └── data/
│   │       └── services/
│   ├── community/
│   │   ├── presentation/
│   │   │   ├── community_screen.dart
│   │   │   └── widgets/
│   │   ├── domain/
│   │   │   └── models/
│   │   └── data/
│   │       └── repositories/
│   └── news/
│       ├── presentation/
│       │   ├── news_screen.dart
│       │   └── widgets/
│       ├── domain/
│       │   └── models/
│       └── data/
│           └── repositories/
├── shared/
│   ├── widgets/               # 共通ウィジェット
│   ├── utils/                # ユーティリティ
│   └── constants/            # 定数
└── core/
    ├── providers/            # Riverpodプロバイダー
    └── services/             # 共通サービス
```

### 移行戦略

#### フェーズ1: プロジェクトセットアップ
1. Flutterプロジェクト作成
2. 必要なパッケージのインストール
3. プロジェクト構造の構築
4. テーマとルーティングの設定

#### フェーズ2: 基本UI実装
1. ボトムナビゲーション実装
2. 各画面の基本レイアウト作成
3. 共通ウィジェットの作成

#### フェーズ3: 機能実装(優先順位順)
1. **ニュース機能**(最も単純)
   - モックデータ表示
   - リストUI
   - Pull to Refresh

2. **コミュニティ機能**(中程度)
   - モックデータ表示
   - 投稿UI
   - 画像表示

3. **練習機能**(複雑)
   - YouTube動画再生
   - 再生コントロール
   - ABループ機能
   - 速度調整

4. **チューナー機能**(最も複雑)
   - マイク権限
   - オーディオ録音
   - 周波数解析
   - リアルタイムUI更新

#### フェーズ4: テストと最適化
1. 各機能の動作確認
2. パフォーマンス最適化
3. UI/UXの調整

### 留意点

1. **YouTube動画再生**: `youtube_player_flutter`パッケージの最新情報を確認
2. **音声解析**: Flutter用の音高検出ライブラリが限定的なため、要調査
3. **パーミッション**: iOS/Androidそれぞれの設定が必要
4. **モックデータ**: 将来のバックエンド連携を考慮した設計
5. **ダークテーマ**: Flutterのテーマシステムで一貫性を保つ

### 成功基準

1. 全機能がReact Native版と同等に動作
2. UI/UXが向上
3. パフォーマンスが改善(特にスクロールとアニメーション)
4. コードの保守性が向上

---

## 次のステップ

1. Flutterプロジェクトの初期化
2. 依存パッケージの調査と選定
3. 基本的なプロジェクト構造の構築
4. 段階的な機能実装

---

## GitHub PagesによるFlutter WebアプリのUIプレビュー

### 要件

- mainブランチへのpush時に自動的にFlutter Webアプリをビルド
- GitHub Pagesにデプロイして、ブラウザでUIを確認可能にする
- 完全無料でコストゼロ
- URLを共有するだけで誰でもアクセス可能

### 設計

#### ビルド対象

**Flutter Web**
- `flutter build web`でWebアプリとしてビルド
- HTML/CSS/JavaScriptに変換されてブラウザで動作
- iOS/Android両方のUIを確認可能（レスポンシブ対応）

#### ワークフロー設計

**トリガー条件**
- mainブランチへのpush時
- 手動トリガー（workflow_dispatch）

**ビルドとデプロイジョブ**
1. Flutterのセットアップ
2. 依存関係のインストール（`flutter pub get`）
3. Webアプリのビルド（`flutter build web --release`）
4. GitHub Pagesへのデプロイ

#### GitHub Pages設定

- デプロイ先: `gh-pages`ブランチ
- 公開URL: `https://<username>.github.io/<repository>/`
- ベースパス設定: `--base-href "/<repository>/"`

#### 使用方法

1. mainブランチにコードをpush
2. GitHub Actionsが自動的にビルド・デプロイ
3. 公開URLにアクセスしてUIを確認
4. スマートフォンのブラウザでアクセスすればモバイルUIを確認可能

### メリット

- **完全無料**: GitHub Pagesは無料で利用可能
- **即座に確認**: URLにアクセスするだけ
- **共有が簡単**: URLを共有すれば誰でもアクセス可能
- **実機不要**: ブラウザの開発者ツールでモバイル表示を確認
- **iOS/Android両対応**: レスポンシブデザインで両方のUIを確認

### 実装方針

1. GitHub Actionsワークフローファイルを作成
2. Flutter Webビルドとgh-pagesブランチへのデプロイを設定
3. READMEにデモサイトのURLを追加
4. モバイル表示の最適化（必要に応じて）

---

## チューナー機能の本実装

### 概要
現在ダミーデータで動作しているチューナー機能を、実際のマイク入力から音程を検出する本実装に変更する。

### 要件

#### 機能要件
1. マイクから音声入力を取得
2. リアルタイムで周波数を分析
3. 検出された周波数から音名を判定
4. 基準音からのずれ(セント)を計算
5. UIに検出結果を表示

#### 技術要件
1. マイク権限の取得
2. 音声ストリームの処理
3. FFT(高速フーリエ変換)による周波数分析
4. ピッチ検出アルゴリズムの実装

### 技術スタック候補

#### 推奨: flutter_pitch_detection
- pub.dev公式パッケージ
- TarsosDSPベースのピッチ検出
- Android/iOS対応
- 周波数、音名、オクターブ、音量、精度を提供
- 2025年時点で最も保守されている

#### その他の選択肢
1. **pitch_detector_dart + flutter_audio_capture**
   - YINアルゴリズム使用
   - より細かい制御が可能

2. **flutter_fft**
   - カスタマイズされたギターチューナー向け
   - TarsosDSP使用

3. **record + fftea**
   - 低レベル実装
   - 完全なカスタマイズが可能

### 実装方針
1. まず`flutter_pitch_detection`を試す（最も安定）
2. 動作しない場合は代替案を検討
3. 段階的に実装
   - マイク権限の設定
   - マイク入力の取得
   - ピッチ検出の実装
   - UI統合とテスト

### 音程検出アルゴリズム

#### サンプリング設定
- サンプリングレート: 44100 Hz または 48000 Hz
- FFTウィンドウサイズ: 2048 または 4096 サンプル

#### 周波数から音名への変換
```
周波数(Hz) → MIDI番号 → 音名
MIDI番号 = 69 + 12 * log2(周波数 / 440)
```

#### セント計算
```
セント = 1200 * log2(検出周波数 / 基準周波数)
```

### プラットフォーム対応

#### iOS
- Info.plistに`NSMicrophoneUsageDescription`追加
- マイク使用理由の説明文を記載

#### Android
- AndroidManifest.xmlに`RECORD_AUDIO`権限追加
- 必要に応じてランタイム権限リクエスト

#### Web
- ブラウザのマイクアクセス権限
- Web Audio APIを使用

### アーキテクチャ

#### ディレクトリ構造
```
lib/features/tuner/
├── presentation/
│   ├── tuner_screen.dart
│   └── widgets/
│       ├── tuner_meter.dart
│       └── tuning_selector.dart
├── domain/
│   ├── models/
│   │   └── pitch_data.dart
│   └── services/
│       └── pitch_detector_service.dart
└── data/
    └── pitch_detector_impl.dart
```

#### コンポーネント設計

**PitchDetectorService**
- マイク入力の開始/停止
- リアルタイムピッチ検出
- 検出データのストリーム提供

**TunerScreen**
- ピッチデータの購読
- UIの更新
- チューニングプリセットの管理

### 次のステップ
1. `flutter_pitch_detection`パッケージの詳細調査
2. プラットフォーム権限の設定
3. ピッチ検出サービスの実装
4. 既存UIとの統合
5. 実機テスト

---

## 練習記録機能の設計

### 概要
コミュニティ機能を練習記録機能に置き換え、ユーザーの練習習慣を可視化し、モチベーションを維持する。

### 機能要件

#### 1. 練習セッションの記録
- 手動で練習セッションを記録
- 記録内容:
  - 日時（自動取得）
  - 練習時間（分単位）
  - 練習内容（テキスト、任意）
  - 使用したチューニング（任意）

#### 2. 練習履歴の表示
- 練習セッションを時系列で表示
- 各セッションの詳細情報を表示
- 削除機能

#### 3. 統計情報の可視化
- 今週の練習時間（棒グラフ）
- 今月の練習時間（棒グラフ）
- 累計練習時間
- 連続練習日数（ストリーク）
- 平均練習時間

#### 4. SNSシェア機能
- 練習記録をテキストで共有
- 共有内容例: 「今日は30分ギターを練習しました！🎸 #GuitarLovers」
- シェア先: Twitter、LINE、その他のアプリ

### データモデル

#### PracticeSession（練習セッション）
```dart
class PracticeSession {
  final String id;              // UUID
  final DateTime dateTime;      // 日時
  final int durationMinutes;    // 練習時間（分）
  final String? notes;          // 練習内容（任意）
  final String? tuning;         // チューニング（任意）

  const PracticeSession({
    required this.id,
    required this.dateTime,
    required this.durationMinutes,
    this.notes,
    this.tuning,
  });
}
```

#### PracticeStats（統計情報）
```dart
class PracticeStats {
  final int totalMinutes;           // 累計時間
  final int weeklyMinutes;          // 今週の合計
  final int monthlyMinutes;         // 今月の合計
  final int currentStreak;          // 連続練習日数
  final int longestStreak;          // 最長連続日数
  final double averageMinutes;      // 平均練習時間

  const PracticeStats({
    required this.totalMinutes,
    required this.weeklyMinutes,
    required this.monthlyMinutes,
    required this.currentStreak,
    required this.longestStreak,
    required this.averageMinutes,
  });
}
```

### UI設計

#### 画面構成
1. **ヘッダー部分**
   - 今週の練習時間
   - 連続練習日数

2. **統計グラフ部分**
   - 週次グラフ（月〜日）
   - 月次グラフ（1日〜31日）
   - タブで切り替え

3. **練習履歴リスト**
   - 最新10件を表示
   - 日付、時間、練習内容
   - スワイプで削除

4. **フローティングアクションボタン**
   - 練習記録の追加ダイアログ表示

#### 追加ダイアログ
- 練習時間の入力（分）
- 練習内容（テキストフィールド、任意）
- キャンセル/保存ボタン

### 技術実装

#### データ永続化
- `shared_preferences`を使用してJSON形式で保存
- キー: `practice_sessions`
- セッションリストをJSON配列として保存

#### グラフ描画
- `fl_chart`パッケージを使用
- 棒グラフで週次・月次データを表示
- インタラクティブな表示（タップで詳細）

#### SNSシェア
- `share_plus`パッケージを使用
- テキスト形式で共有
- 統計情報も含めて共有可能

### ディレクトリ構造
```
lib/features/history/
├── domain/
│   ├── models/
│   │   ├── practice_session.dart
│   │   └── practice_stats.dart
│   └── services/
│       └── practice_history_service.dart
├── data/
│   └── practice_history_repository.dart
├── providers/
│   └── practice_history_provider.dart
└── history_screen.dart
```

### 実装フェーズ

#### フェーズ1: 基本機能
1. データモデルの作成
2. リポジトリ層の実装（shared_preferences）
3. プロバイダーの実装
4. 基本UIの作成（リスト表示）
5. 追加・削除機能

#### フェーズ2: 統計機能
1. 統計情報の計算ロジック
2. グラフUIの実装
3. 統計表示の実装

#### フェーズ3: シェア機能
1. share_plusパッケージの統合
2. シェアテキストの生成
3. シェアボタンの実装

### メリット
- バックエンド不要（ローカル完結）
- 開発コストが低い
- ユーザーのモチベーション維持に貢献
- SNSシェアでアプリの宣伝効果
- プライバシー保護（データは端末内のみ）
