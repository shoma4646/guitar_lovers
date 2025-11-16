# Guitar Lovers

ギター愛好家向けモバイルアプリケーション(Flutter版)

## 🌐 デモサイト

ブラウザでアプリのUIを確認できます:

**https://shoma4646.github.io/guitar_lovers/**

※実際のGitHubユーザー名に応じてURLが変わります。mainブランチへのpush後、数分でデプロイされます。

## 概要

Guitar Loversはギタリストのためのオールインワンアプリケーションです。チューナー、練習支援、コミュニティ、ニュース機能を提供します。

このプロジェクトはReact Native(Expo)からFlutterに移行されました。Flutterの学習教材としても活用できるよう、初学者にもわかりやすい設計を心がけています。

## 主な機能

### ✅ 実装済み

- **ニュース機能**: ギター関連のニュース閲覧
  - モックデータ表示
  - 画像キャッシング
  - Pull to Refresh

- **練習記録機能**: 練習習慣の管理とモチベーション維持
  - 練習セッションの記録（時間・内容）
  - 練習時間の統計グラフ（週次）
  - 連続練習日数の表示
  - SNSシェア機能
  - ローカルストレージでデータ保存

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
- **状態管理**: Riverpod 2.6.1 + Riverpod Generator
- **言語**: Dart 3.4.3
- **主要パッケージ**:
  - `flutter_riverpod`: 状態管理
  - `riverpod_annotation`: Riverpodのコード生成アノテーション
  - `riverpod_generator`: Riverpodのコード生成ツール
  - `build_runner`: Dartのコード生成実行ツール
  - `go_router`: ルーティング管理
  - `shimmer`: ローディングUI
  - `url_launcher`: 外部リンク起動
  - `shared_preferences`: ローカルストレージ
  - `pitch_detector_dart`: ピッチ検出
  - `flutter_audio_capture`: 音声キャプチャ
  - `permission_handler`: 権限管理
  - `fl_chart`: グラフ表示
  - `share_plus`: SNSシェア機能
  - `uuid`: ID生成
  - `intl`: 日付フォーマット

**注**: YouTube Playerは互換性の問題により一時的に無効化しています。

## セットアップ

### 必要要件

- Flutter SDK 3.22.2以上
- Dart 3.4.3以上
- Android Studio / Xcode

### インストール

```bash
# 依存関係のインストール
flutter pub get

# コード生成（Riverpod Generatorの実行）
flutter pub run build_runner build --delete-conflicting-outputs

# アプリの実行
flutter run

# テストの実行
flutter test
```

### コード生成について

このプロジェクトでは**Riverpod Generator**を使用しているため、プロバイダーを追加・変更した場合はコード生成が必要です。

#### コード生成の実行方法

**1回だけ生成する場合**:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

**ファイル変更を監視して自動生成する場合（開発時推奨）**:
```bash
flutter pub run build_runner watch --delete-conflicting-outputs
```

#### コード生成が必要なファイル

`@riverpod`アノテーションを使用しているファイル:
- `lib/features/tuner/providers/pitch_detector_provider.dart`

コード生成により以下のファイルが自動生成されます:
- `lib/features/tuner/providers/pitch_detector_provider.g.dart`

**注意**: `.g.dart`ファイルは自動生成されるため、手動で編集しないでください。

## プロジェクト構造

```
lib/
├── main.dart                    # アプリのエントリーポイント
│
├── features/                    # ビジネスロジック層（UI非依存）
│   ├── tuner/                  # チューナー機能
│   │   ├── domain/            # ドメイン層
│   │   │   ├── pitch_data.dart  # ピッチデータモデル
│   │   │   ├── tuning.dart     # チューニングプリセット
│   │   │   └── services/
│   │   │       ├── pitch_detector_service.dart     # インターフェース
│   │   │       └── pitch_calculation_service.dart  # 音高計算ユーティリティ
│   │   ├── data/              # データ層
│   │   │   └── pitch_detector_impl.dart  # ピッチ検出の実装
│   │   └── application/       # アプリケーション層
│   │       ├── pitch_detector_provider.dart  # Riverpod Generator
│   │       └── pitch_detector_provider.g.dart  # 自動生成
│   │
│   ├── history/                # 練習記録機能
│   │   ├── domain/
│   │   │   ├── practice_session.dart  # セッションモデル
│   │   │   └── practice_stats.dart    # 統計モデル
│   │   ├── data/
│   │   │   └── practice_history_repository.dart  # データ永続化
│   │   └── application/
│   │       ├── practice_history_provider.dart
│   │       └── practice_history_provider.g.dart
│   │
│   ├── news/                   # ニュース機能
│   │   ├── domain/
│   │   ├── data/
│   │   └── application/
│   │
│   └── practice/               # 練習機能
│       ├── domain/
│       ├── data/
│       └── application/
│
├── presentation/                # UI層（完全分離）
│   ├── screens/
│   │   ├── tuner/
│   │   │   └── tuner_screen.dart
│   │   ├── history/
│   │   │   └── history_screen.dart
│   │   ├── news/
│   │   │   └── news_screen.dart
│   │   └── practice/
│   │       └── practice_screen.dart
│   └── widgets/
│       ├── tuner/
│       ├── history/
│       ├── news/
│       ├── practice/
│       └── common/             # 共通UIコンポーネント
│
└── shared/                      # インフラストラクチャ層
    ├── theme/
    │   └── app_theme.dart      # Material Design 3テーマ
    └── constants/
        └── app_colors.dart     # カラーパレット
```

### アーキテクチャ設計（Clean Architecture準拠）

このプロジェクトは**Clean Architecture + Presentation完全分離**パターンを採用しています：

**依存関係の方向:**
```
presentation → features/application → features/data → features/domain
   (UI層)         (状態管理)           (データ層)      (ビジネスロジック)
```

**各層の役割:**
- **features/domain**: ビジネスロジックとドメインモデル（最も重要、他の層に依存しない）
- **features/data**: データアクセス（API、DB、SharedPreferences等）
- **features/application**: 状態管理とユースケース（Riverpod Provider）
- **presentation**: UI（画面とウィジェット、完全に分離）

**メリット:**
- UI変更がビジネスロジックに影響しない
- features層をUI無しでテスト可能
- 同じビジネスロジックで複数のUI（Web/Mobile）を作成可能
- チーム開発で役割分担が明確（UI担当/ロジック担当）

## 設計方針(初学者向け)

このプロジェクトは、Flutterのベストプラクティスに従いつつ、初学者にも理解しやすいシンプルな構成を採用しています。

### アーキテクチャパターン

**Clean Architecture + Presentation完全分離**を採用しています。

**特徴:**
1. **features層（ビジネスロジック）とpresentation層（UI）を完全分離**
   - features層はUIライブラリに依存しない
   - presentation層はビジネスロジックを持たない

2. **依存関係が一方向**
   ```
   presentation → features
   ```
   - presentationはfeaturesに依存できる
   - featuresはpresentationを知らない（逆方向は禁止）

3. **機能ごとに4層構造**
   ```
   features/tuner/
   ├── domain/        # ドメインモデル（最重要）
   ├── data/          # データアクセス
   ├── application/   # 状態管理
   ```
   ```
   presentation/screens/tuner/
   └── tuner_screen.dart  # UI（完全分離）
   ```

**メリット:**
- **テスタビリティ**: UI無しでビジネスロジックをテスト可能
- **保守性**: UI変更がビジネスロジックに影響しない
- **再利用性**: 同じfeatures層で異なるUI（Web/Mobile/Desktop）を作成可能
- **チーム開発**: UI担当とロジック担当で完全分離できる

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
// lib/presentation/screens/news/news_screen.dart
class NewsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // features層のプロバイダーを監視
    final articlesAsync = ref.watch(newsArticlesProvider);

    return articlesAsync.when(
      data: (articles) => ListView.builder(
        itemCount: articles.length,
        itemBuilder: (context, index) {
          return ArticleCard(article: articles[index]);
        },
      ),
      loading: () => CircularProgressIndicator(),
      error: (error, _) => Text('Error: $error'),
    );
  }
}
```

**ポイント:**
- **presentation層からfeatures層のプロバイダーを使用**
- **AsyncValue.when()でローディング/エラー状態を統一的に処理**

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

## GitHub Pagesへのデプロイ

このプロジェクトはGitHub Actionsで自動的にGitHub Pagesにデプロイされます。

### 自動デプロイ

mainブランチへのpush時に自動的に以下が実行されます:

1. Flutter Webアプリのビルド
2. `gh-pages`ブランチへのデプロイ
3. GitHub Pagesでの公開

### 手動デプロイ

GitHub Actionsタブから手動でデプロイを実行することもできます:

1. リポジトリの「Actions」タブを開く
2. 「Deploy to GitHub Pages」ワークフローを選択
3. 「Run workflow」ボタンをクリック

### GitHub Pages設定

初回のみ、以下の設定が必要です:

1. リポジトリの「Settings」タブを開く
2. 左メニューから「Pages」を選択
3. 「Source」で`gh-pages`ブランチを選択
4. 「Save」をクリック

数分後、デモサイトが公開されます。

## ライセンス

Private Project
