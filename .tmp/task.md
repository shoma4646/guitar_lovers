# Flutter移行タスク一覧

## フェーズ1: プロジェクトセットアップ ✅

### 1.1 環境準備 ✅
- [x] Flutter SDKのインストール確認
- [x] Android Studio / Xcode セットアップ確認
- [x] Flutter Doctorで環境チェック

### 1.2 プロジェクト初期化 ✅
- [x] `flutter create guitar_lovers_flutter`でプロジェクト作成
- [x] プロジェクト名とパッケージ名の設定
- [ ] GitリポジトリのセットアップまたはReact Nativeと並行管理の検討

### 1.3 依存パッケージのインストール ✅
- [x] `pubspec.yaml`に必要なパッケージを追加
  - [x] 状態管理: `flutter_riverpod`
  - [x] ルーティング: `go_router` (未使用、シンプルなNavigationBar使用)
  - [x] チューナー関連:
    - [x] `permission_handler`
    - [x] `record`
    - [x] 音声解析ライブラリの選定と追加 (`pitch_detector_dart`, `fftea`)
  - [x] 練習機能:
    - [x] `youtube_player_flutter`
  - [x] UI/UX:
    - [x] `cached_network_image`
    - [x] `shimmer`
  - [x] ユーティリティ:
    - [x] `url_launcher`
    - [x] `shared_preferences`
- [x] `flutter pub get`で依存関係を解決

### 1.4 プロジェクト構造の構築 ✅
- [x] `lib/`以下にディレクトリ構造を作成
  - [x] `features/`ディレクトリ作成
  - [x] `shared/`ディレクトリ作成
  - [x] `models/`ディレクトリ作成
  - [x] `providers/`ディレクトリ作成
- [x] 各機能フォルダ作成
  - [x] `tuner/`
  - [x] `practice/`
  - [x] `community/`
  - [x] `news/`

### 1.5 基本設定ファイルの作成 ✅
- [x] `lib/shared/theme/app_theme.dart`でテーマ設定を作成
  - [x] ダークテーマの定義
  - [x] カラースキームの設定(#1a1a1a, #4CAF50など)
  - [x] テキストスタイルの定義
- [x] `lib/shared/constants/app_colors.dart`でカラー定数を作成
- [x] `lib/main.dart`の基本実装
  - [x] MaterialAppの設定
  - [x] ProviderScopeの設定
  - [x] テーマの適用
  - [x] NavigationBarによるボトムナビゲーション実装

---

## フェーズ2: 基本UI実装 ✅

### 2.1 ボトムナビゲーション ✅
- [x] ボトムナビゲーションバーのウィジェット作成
- [x] 4つのタブアイコンの設定
  - [x] チューナー
  - [x] 練習
  - [x] コミュニティ
  - [x] ニュース
- [x] アクティブ/非アクティブ時の色設定
- [x] タブ切り替え動作の実装

### 2.2 各画面のスケルトン作成 ✅
- [x] `lib/features/tuner/tuner_screen.dart`作成
- [x] `lib/features/practice/practice_screen.dart`作成
- [x] `lib/features/community/community_screen.dart`作成
- [x] `lib/features/news/news_screen.dart`作成

### 2.3 共通ウィジェットの作成
- [ ] `lib/shared/widgets/`に共通ウィジェット配置
  - [ ] カスタムボタン
  - [ ] ローディングインジケーター
  - [ ] エラー表示ウィジェット

---

## フェーズ3: 機能実装

### 3.1 ニュース機能(優先度: 高、難易度: 低) ✅

#### 3.1.1 データモデル ✅
- [x] `lib/models/news_article.dart`作成
  - [x] id, title, excerpt, image, date, categoryフィールド
  - [x] fromJson/toJsonメソッド

#### 3.1.2 UI実装 ✅
- [x] ニュース一覧画面のレイアウト作成
  - [x] ListView.builderでニュース一覧表示
  - [x] ニュースカードウィジェット作成
  - [x] サムネイル画像表示(`cached_network_image`使用)
  - [x] カテゴリバッジ表示
  - [x] 日付表示
- [x] Pull to Refresh機能実装
  - [x] RefreshIndicatorウィジェット使用

#### 3.1.3 状態管理 ✅
- [x] モックデータ用のプロバイダー作成
- [x] ニュース一覧取得ロジック

---

### 3.2 コミュニティ機能(優先度: 高、難易度: 中) ✅

#### 3.2.1 データモデル ✅
- [x] `lib/models/post.dart`作成
  - [x] id, username, content, timestamp, likes, comments, imageフィールド
  - [x] fromJson/toJsonメソッド

#### 3.2.2 投稿作成UI ✅
- [x] テキスト入力フィールド
- [x] 画像添付ボタン(UI実装のみ)
- [x] 投稿ボタン

#### 3.2.3 投稿一覧UI ✅
- [x] ListView.builderで投稿一覧表示
- [x] 投稿カードウィジェット作成
  - [x] ユーザー名とタイムスタンプ表示
  - [x] 投稿内容表示
  - [x] 画像表示(`cached_network_image`使用)
  - [x] いいね・コメント数表示

#### 3.2.4 状態管理 ✅
- [x] モックデータ用のプロバイダー作成
- [x] 投稿一覧取得ロジック
- [x] 新規投稿追加ロジック(モック)

---

### 3.3 練習機能(優先度: 中、難易度: 高)

#### 3.3.1 YouTube動画プレイヤー
- [ ] `youtube_player_flutter`の統合
- [ ] YouTube URL入力フィールド
- [ ] 動画ID抽出ロジック
- [ ] 動画プレイヤーウィジェット作成
- [ ] 動画読み込み処理

#### 3.3.2 再生コントロール
- [ ] 再生/一時停止ボタン
- [ ] シークバー実装
  - [ ] Sliderウィジェット使用
  - [ ] 現在位置と総時間の表示
  - [ ] シーク操作のハンドリング
- [ ] 10秒戻し/送りボタン
- [ ] 再生時間のフォーマット表示

#### 3.3.3 速度調整
- [ ] 速度選択ボタン群(0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- [ ] アクティブ状態の表示
- [ ] プレイヤーへの速度設定適用

#### 3.3.4 ABループ機能
- [ ] ループ開始点(A)設定ボタン
- [ ] ループ終了点(B)設定ボタン
- [ ] ループON/OFFトグルボタン
- [ ] ループポイント時間表示
- [ ] ループクリアボタン
- [ ] ループ再生ロジック実装
  - [ ] 現在位置の監視
  - [ ] 終了点到達時の開始点へのシーク

#### 3.3.5 状態管理
- [ ] 動画URL状態管理
- [ ] 再生状態管理
- [ ] 再生速度状態管理
- [ ] ループポイント状態管理
- [ ] 現在時刻と総時間の状態管理

---

### 3.4 チューナー機能本実装(優先度: 高、難易度: 最高)

#### 3.4.0 前提調査
- [x] `flutter_pitch_detection`パッケージの詳細調査
  - [x] pub.devでのパッケージ情報確認
  - [x] サンプルコードの確認
  - [x] プラットフォーム対応状況の確認(iOS未対応)
- [x] 代替パッケージの調査
  - [x] `pitch_detector_dart` + `flutter_audio_capture`を選択

#### 3.4.1 パッケージ追加
- [x] `pubspec.yaml`にパッケージ追加
  - [x] `pitch_detector_dart: ^0.0.7`
  - [x] `flutter_audio_capture: ^1.1.11`
  - [x] `permission_handler: ^11.3.1`
- [x] `flutter pub get`実行

#### 3.4.2 プラットフォーム権限設定
- [x] iOS設定
  - [x] `ios/Runner/Info.plist`に`NSMicrophoneUsageDescription`追加
  - [x] 使用理由の説明文を日本語で記載
- [x] Android設定
  - [x] `android/app/src/main/AndroidManifest.xml`に`RECORD_AUDIO`権限追加
- [ ] Web設定(実機テスト時に確認)

#### 3.4.3 データモデル作成
- [x] `lib/features/tuner/domain/models/pitch_data.dart`作成
  - [x] 周波数、音名、オクターブ、セント、精度フィールド
  - [x] copyWithメソッド
  - [x] 周波数から音名への変換メソッド
  - [x] セント計算メソッド

#### 3.4.4 ピッチ検出サービス作成
- [x] `lib/features/tuner/domain/services/pitch_detector_service.dart`インターフェース作成
  - [x] start()メソッド
  - [x] stop()メソッド
  - [x] pitchStreamゲッター(Stream<PitchData>)
- [x] `lib/features/tuner/data/pitch_detector_impl.dart`実装クラス作成
  - [x] `pitch_detector_dart` + `flutter_audio_capture`の統合
  - [x] マイク入力の開始/停止
  - [x] ピッチデータのストリーム提供
  - [x] エラーハンドリング

#### 3.4.5 Riverpodプロバイダー作成
- [x] `lib/features/tuner/providers/pitch_detector_provider.dart`作成
  - [x] ピッチ検出サービスのプロバイダー
  - [x] ピッチデータのStreamProvider
  - [x] 録音状態のStateProvider

#### 3.4.6 TunerScreenの更新
- [x] モックロジックの削除
  - [x] `_startMockDetection()`メソッド削除
  - [x] `_stopMockDetection()`メソッド削除
  - [x] `_mockTimer`関連コード削除
- [x] 実際のピッチ検出サービスとの連携
  - [x] プロバイダーからのデータ購読
  - [x] UIへのデータ反映
- [x] 権限リクエストの実装
  - [x] 権限リクエストはサービス内で処理
  - [x] 権限拒否時のエラーメッセージ表示
- [x] エラーハンドリング
  - [x] マイクアクセスエラー
  - [x] ピッチ検出エラー

#### 3.4.7 UI調整
- [x] デモモード注意書きの削除
- [x] エラー状態の表示
- [x] ローディング状態の表示
- [ ] パフォーマンス最適化(実機テスト後)

#### 3.4.8 テスト
- [ ] Android実機テスト
  - [ ] 権限リクエストの動作確認
  - [ ] ギター音の検出精度確認
  - [ ] UI更新のスムーズさ確認
- [ ] iOS実機テスト(可能であれば)
  - [ ] 権限リクエストの動作確認
  - [ ] ギター音の検出精度確認
- [ ] エッジケーステスト
  - [ ] マイク権限拒否時
  - [ ] バックグラウンド時
  - [ ] 複数音同時発生時

---

## フェーズ4: テストと最適化

### 4.1 動作確認
- [ ] 各画面の表示確認
- [ ] ナビゲーション動作確認
- [ ] ニュース機能のテスト
- [ ] コミュニティ機能のテスト
- [ ] 練習機能のテスト
  - [ ] YouTube動画再生
  - [ ] 速度調整
  - [ ] ABループ
- [ ] チューナー機能のテスト
  - [ ] 音声入力
  - [ ] 周波数解析の精度

### 4.2 パフォーマンス最適化
- [ ] 画像のキャッシング確認
- [ ] リスト表示のスムーズさ確認
- [ ] 不要なリビルドの削減
- [ ] メモリ使用量の確認

### 4.3 UI/UX調整
- [ ] ダークテーマの色調整
- [ ] アニメーション効果の追加
- [ ] ローディング状態の表示改善
- [ ] エラーハンドリングの改善

### 4.4 プラットフォーム別確認
- [ ] iOS実機での動作確認
- [ ] Android実機での動作確認
- [ ] 各プラットフォーム固有の問題の修正

---

## フェーズ5: 仕上げ

### 5.1 ドキュメント作成 ✅
- [x] README.mdの作成
- [x] セットアップ手順の記載
- [x] 使用技術の説明
- [x] ビルド手順の記載
- [x] 初学者向け設計方針の説明追加
- [x] Flutter基礎ドキュメント(docs/flutter_basics.md)の作成

### 5.2 コードクリーンアップ
- [ ] 未使用のインポート削除
- [ ] コードフォーマット適用
- [ ] コメントの追加

### 5.3 リリース準備
- [ ] アプリアイコンの設定
- [ ] スプラッシュスクリーンの設定
- [ ] アプリ名の設定
- [ ] バージョン番号の設定

---

## 備考

- 各タスクは小さな単位に分割されており、1つずつ実装とコミットを行う
- 優先度の高い機能から実装を開始
- チューナー機能は音声解析ライブラリの選定が鍵となるため、事前調査が重要
- モックデータを使用する機能は、将来のバックエンド連携を考慮したインターフェース設計を行う
