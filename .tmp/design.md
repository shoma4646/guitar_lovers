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

#### 3. コミュニティ機能 (community.tsx)
- **目的**: ユーザー間の交流
- **主要機能**:
  - テキスト投稿作成
  - 画像・動画添付(UI実装のみ)
  - 投稿一覧表示
  - いいね・コメント数表示(UI実装のみ)
  - モックデータ使用
- **技術要件**:
  - 画像表示
  - リスト表示
  - 将来的にバックエンド連携が必要

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
