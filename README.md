# Guitar Lovers

ギター愛好家向けモバイルアプリケーション(Flutter版)

## 概要

Guitar Loversはギタリストのためのオールインワンアプリケーションです。チューナー、練習支援、コミュニティ、ニュース機能を提供します。

このプロジェクトはReact Native(Expo)からFlutterに移行されました。Flutterの学習教材としても活用できるよう、初学者にもわかりやすい設計を心がけています。

## 主な機能

### ✅ 実装済み

- **ニュース機能**: ギター関連のニュース閲覧
  - モックデータ表示
  - 画像キャッシング
  - Pull to Refresh

- **コミュニティ機能**: ユーザー間の交流
  - 投稿作成・一覧表示
  - いいね・コメント数表示
  - 画像・動画プレースホルダー

- **練習機能**: YouTube動画を使った練習支援
  - YouTube URL入力
  - YouTube動画プレーヤー統合
  - 再生速度調整(0.5x - 2x)
  - ABループ機能
  - シークバー・再生コントロール
  - 10秒戻し/送り機能

- **チューナー機能**: ギターチューニング支援(デモモード)
  - チューニングプリセット(Standard, Half Step Down, Drop D)
  - ビジュアルメーター表示
  - セント表示
  - チューニング状態インジケーター

### ⚠️ 注意事項

- **YouTube Player**: Flutter SDKの互換性により、一部環境でコンパイルエラーが発生する可能性があります
- **チューナー機能**: 現在はデモモードで、実際の音声入力は未実装です

## 技術スタック

- **フレームワーク**: Flutter 3.22.2
- **状態管理**: Riverpod 2.6.1
- **言語**: Dart 3.4.3
- **主要パッケージ**:
  - `cached_network_image`: 画像キャッシング
  - `go_router`: ルーティング管理
  - `shimmer`: ローディングUI
  - `url_launcher`: 外部リンク起動
  - `shared_preferences`: ローカルストレージ

**注**: YouTube Playerや音声入力関連パッケージは互換性の問題により一時的に無効化しています。

## セットアップ

### 必要要件

- Flutter SDK 3.22.2以上
- Dart 3.4.3以上
- Android Studio / Xcode

### インストール

```bash
# 依存関係のインストール
flutter pub get

# アプリの実行
flutter run

# テストの実行
flutter test
```

## プロジェクト構造

```
lib/
├── main.dart                    # アプリのエントリーポイント
│                                # ProviderScopeとMainScreenを含む
│
├── features/                    # 機能別のUI画面(Feature-First設計)
│   ├── tuner/                  # チューナー機能
│   │   └── tuner_screen.dart  # チューニング画面とデモロジック
│   ├── practice/               # 練習機能(現在プレースホルダー)
│   │   └── practice_screen.dart
│   ├── community/              # コミュニティ機能
│   │   └── community_screen.dart
│   └── news/                   # ニュース機能
│       └── news_screen.dart
│
├── models/                      # データモデル(Immutableクラス)
│   ├── news_article.dart       # ニュース記事モデル
│   ├── post.dart               # コミュニティ投稿モデル
│   ├── practice_state.dart     # 練習画面の状態モデル
│   └── tuning.dart             # チューニングプリセットモデル
│
├── providers/                   # Riverpod状態管理
│   ├── news_provider.dart      # Provider(読み取り専用)
│   ├── community_provider.dart # StateNotifierProvider(状態変更可能)
│   └── practice_provider.dart  # StateNotifierProvider
│
├── services/                    # ビジネスロジック
│   └── pitch_detector_service.dart  # 音高計算ユーティリティ
│
└── shared/                      # 共通リソース
    ├── theme/
    │   └── app_theme.dart      # Material Design 3テーマ定義
    └── constants/
        └── app_colors.dart     # カラーパレット定数
```

## 設計方針(初学者向け)

このプロジェクトは、Flutterのベストプラクティスに従いつつ、初学者にも理解しやすいシンプルな構成を採用しています。

### アーキテクチャパターン

**Feature-First設計**を採用しています。これは、機能ごとにフォルダを分け、関連するファイルをまとめる方法です。

```
features/
├── tuner/          # チューナー機能のすべて
├── practice/       # 練習機能のすべて
├── community/      # コミュニティ機能のすべて
└── news/           # ニュース機能のすべて
```

**メリット**:
- 機能を追加・削除しやすい
- 関連するコードが近くにあるため理解しやすい
- チーム開発時に機能ごとに分担しやすい

### 状態管理: Riverpod

**Riverpod**はFlutterの状態管理ライブラリです。アプリ全体でデータを共有・管理するために使用します。

#### 3種類のプロバイダー

1. **Provider**(読み取り専用)
   ```dart
   // 例: lib/providers/news_provider.dart
   final newsProvider = Provider<List<NewsArticle>>((ref) {
     return [/* モックデータ */];
   });
   ```
   - データが変更されない場合に使用
   - 設定値やモックデータに最適

2. **StateNotifierProvider**(状態変更可能)
   ```dart
   // 例: lib/providers/community_provider.dart
   final communityProvider = StateNotifierProvider<CommunityNotifier, List<Post>>((ref) {
     return CommunityNotifier();
   });
   ```
   - ユーザーの操作でデータが変わる場合に使用
   - 投稿の追加・削除などに最適

3. **StateProvider**(シンプルな状態)
   - 単一の値(数値、文字列など)を管理
   - このプロジェクトでは未使用

#### 使い方の例

```dart
// 画面でプロバイダーを使う
class NewsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // プロバイダーからデータを取得
    final articles = ref.watch(newsProvider);

    return ListView.builder(
      itemCount: articles.length,
      itemBuilder: (context, index) {
        return ArticleCard(article: articles[index]);
      },
    );
  }
}
```

### モデルクラス

データ構造を定義するクラスです。すべてImmutable(変更不可)にしています。

```dart
// 例: lib/models/news_article.dart
class NewsArticle {
  final String id;
  final String title;
  final String excerpt;
  final String imageUrl;
  final DateTime publishedAt;
  final String category;

  const NewsArticle({
    required this.id,
    required this.title,
    required this.excerpt,
    required this.imageUrl,
    required this.publishedAt,
    required this.category,
  });
}
```

**なぜImmutableにするのか**:
- バグを防ぐ(意図しない変更を防止)
- 状態管理がシンプルになる
- パフォーマンスが向上する

### UIアニメーション

チューナー画面では、スムーズなアニメーションを実装しています。

```dart
// TweenAnimationBuilder: 数値の変化をアニメーション化
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0, end: _cents),
  duration: const Duration(milliseconds: 100),
  curve: Curves.easeOut,
  builder: (context, value, child) {
    return Transform.translate(
      offset: Offset(value * 1.5, 0),
      child: /* インジケーター */,
    );
  },
)

// AnimatedContainer: サイズや色の変化をアニメーション化
AnimatedContainer(
  duration: const Duration(milliseconds: 150),
  decoration: BoxDecoration(
    color: _getMeterColor(),
    borderRadius: BorderRadius.circular(4),
  ),
)
```

### Material Design 3テーマ

Googleが提供する最新のデザインシステムを使用しています。

```dart
// lib/shared/theme/app_theme.dart
static final darkTheme = ThemeData(
  useMaterial3: true,  // Material Design 3を有効化
  colorScheme: ColorScheme.dark(
    primary: AppColors.primary,      // #4CAF50
    background: AppColors.backgroundDark,  // #1A1A1A
    error: AppColors.error,          // #F44336
  ),
  // ...
);
```

### デバイス対応

- **iOS**: iPhoneとiPad対応(シミュレーターで動作確認可能)
- **Android**: スマートフォンとタブレット対応
- **Web**: Chrome対応(一部機能制限あり)

**注**: Mac Designed for iPadは現在のFlutter CLIではサポートされていません。

### コード品質

- **Linter**: `flutter_lints`でコード品質を保証
- **テスト**: ウィジェットテストを実装
- **フォーマット**: Dartの標準フォーマッターを使用

```bash
# コードの静的解析
flutter analyze

# テストの実行
flutter test

# コードフォーマット
dart format lib/
```

## 学習リソース

Flutterを学ぶための推奨リソース:

- [Flutter公式ドキュメント](https://docs.flutter.dev/)
- [Riverpod公式ドキュメント](https://riverpod.dev/)
- [Material Design 3](https://m3.material.io/)

## 設計ドキュメント

- [設計書](.tmp/design.md): プロジェクトの設計方針と技術選定
- [タスクリスト](.tmp/task.md): 実装タスクと進捗管理

## カラーパレット

- 背景(ダーク): `#1A1A1A`
- 背景(ライトダーク): `#2A2A2A`
- 背景(グレー): `#333333`
- アクセント(グリーン): `#4CAF50`
- テキスト(白): `#FFFFFF`
- テキスト(グレー): `#888888`
- エラー(赤): `#F44336`

## トラブルシューティング

### アプリが起動しない

```bash
# 依存関係を再インストール
flutter clean
flutter pub get

# デバイスを確認
flutter devices

# iOSシミュレーターを起動
open -a Simulator
flutter run
```

### ビルドエラーが出る

```bash
# キャッシュをクリア
flutter clean
rm -rf ios/Pods ios/Podfile.lock
flutter pub get
cd ios && pod install && cd ..
```

## ライセンス

Private Project
