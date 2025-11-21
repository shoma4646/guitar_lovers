# Guitar Lovers プロジェクトガイドライン

ギター愛好家向けFlutterアプリケーションのAIアシスタント向け開発ガイドライン

## 言語設定

- **すべてのレビューとフィードバックは日本語で行う**
- コードレビュー、提案、説明はすべて日本語で記述する
- コミットメッセージの説明も日本語で行う

## コミットメッセージルール

すべてのコミットメッセージは以下の形式に従う：

- プレフィックスは英語、説明は日本語
- 使用可能なプレフィックス：
  - `feature:` - 新機能追加
  - `fix:` - バグ修正
  - `chore:` - ビルドプロセス、依存関係の更新など
  - `docs:` - ドキュメントのみの変更
  - `refactor:` - リファクタリング
  - `test:` - テストの追加・修正
  - `style:` - コードフォーマットなど
  - `perf:` - パフォーマンス改善

例：`feature: GitHub Pagesへの自動デプロイを追加`

## プロジェクト概要

- **アプリ名**: Guitar Lovers
- **フレームワーク**: Flutter 3.24.0
- **言語**: Dart (SDK 3.5.0 - 4.0.0)
- **状態管理**: Riverpod + Riverpod Generator (コード生成)
- **アーキテクチャ**: Clean Architecture + Presentation完全分離

### 主要機能

| 機能 | 状態 | 説明 |
|------|------|------|
| チューナー | ✅ 実装済み | デモモード、pitch_detector_dart使用 |
| 練習記録 | ✅ 実装済み | SharedPreferences、統計グラフ |
| ニュース | ✅ 実装済み | モックデータ、Pull to Refresh |
| 練習(YouTube) | ⚠️ 部分実装 | Flutter互換性の問題あり |

## ディレクトリ構造

```
lib/
├── main.dart                          # アプリエントリーポイント・ナビゲーション
│
├── features/                          # ビジネスロジック層（UI非依存）
│   ├── tuner/                        # チューナー機能
│   │   ├── domain/                   # ドメインモデル・インターフェース
│   │   ├── data/                     # データアクセス実装
│   │   └── application/              # Riverpod Provider
│   ├── history/                      # 練習記録機能
│   ├── news/                         # ニュース機能
│   └── practice/                     # 練習機能
│
├── presentation/                     # UI層（完全分離）
│   ├── screens/                      # 画面コンポーネント
│   │   ├── tuner/
│   │   ├── history/
│   │   ├── practice/
│   │   └── news/
│   └── widgets/                      # 再利用可能なUIコンポーネント
│
└── shared/                           # インフラストラクチャ層
    ├── theme/
    │   └── app_theme.dart            # Material Design 3テーマ
    └── constants/
        └── app_colors.dart           # カラーパレット定数
```

### 各層の役割

- **domain/**: ビジネスロジック、モデル、サービスインターフェース（外部依存なし）
- **data/**: データアクセス（API、DB、SharedPreferences）
- **application/**: Riverpod Providerによる状態管理
- **presentation/**: UI（ビジネスロジックを持たない）

## アーキテクチャパターン

### 依存関係の方向（一方向のみ）

```
presentation → features (application → data → domain)
```

### 機能モジュール構造

各機能は以下の構造に従う：

```
feature/
├── domain/        # コアロジック
├── data/          # データアクセス
└── application/   # 状態管理
```

## コード生成（重要）

このプロジェクトは**Riverpod Generator**を使用しており、`@riverpod`アノテーションを含むファイルを変更した場合はコード生成が必要。

### コード生成コマンド

```bash
# 1回だけ生成
flutter pub run build_runner build --delete-conflicting-outputs

# ファイル監視して自動生成（開発時推奨）
flutter pub run build_runner watch --delete-conflicting-outputs
```

### 生成されるファイル

- `*.g.dart`ファイルは自動生成される
- **手動編集禁止**
- Gitにコミットする

### コード生成が必要なファイル

- `lib/features/tuner/application/pitch_detector_provider.dart`
- `lib/features/history/application/practice_history_provider.dart`
- `lib/features/news/application/news_provider.dart`

## Riverpodパターン

### @riverpod関数（読み取り専用の非同期データ）

```dart
@riverpod
Future<SharedPreferences> sharedPreferences(Ref ref) async {
  return SharedPreferences.getInstance();
}
```

### @riverpodクラス（変更可能な状態）

```dart
@riverpod
class PracticeSessions extends _$PracticeSessions {
  @override
  Future<List<PracticeSession>> build() async {
    // 初期データ取得
  }

  Future<void> addSession(PracticeSession session) async {
    // 状態更新
  }
}
```

### UI層での使用

```dart
class NewsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articlesAsync = ref.watch(newsArticlesProvider);

    return articlesAsync.when(
      data: (articles) => ListView.builder(...),
      loading: () => CircularProgressIndicator(),
      error: (error, _) => Text('Error: $error'),
    );
  }
}
```

## コードスタイル

### 命名規則

- **クラス**: PascalCase（例: `PracticeSession`, `PitchData`）
- **メソッド/変数**: camelCase（例: `addSession`, `isPitched`）
- **定数**: UPPER_SNAKE_CASE（例: `STORAGE_KEY`）
- **ファイル**: snake_case.dart（例: `pitch_detector_impl.dart`）
- **Provider**: camelCase + Provider接尾辞（例: `practiceSessionsProvider`）
- **生成ファイル**: `.g.dart`接尾辞

### フォーマット

- Dartの標準フォーマッターを使用
- `flutter_lints`でコード品質を保証
- コメントは日本語で記述
- ドキュメントコメント（`///`）も日本語で記述

### モデル設計パターン

```dart
@immutable
class PracticeSession {
  final String id;
  final DateTime date;
  final int durationMinutes;

  const PracticeSession({
    required this.id,
    required this.date,
    required this.durationMinutes,
  });

  // ファクトリコンストラクタ
  factory PracticeSession.create({...}) { ... }

  // イミュータブルな更新
  PracticeSession copyWith({...}) { ... }

  // シリアライズ
  factory PracticeSession.fromJson(Map<String, dynamic> json) { ... }
  Map<String, dynamic> toJson() { ... }
}
```

## 開発コマンド

### 基本コマンド

```bash
# 依存関係インストール
flutter pub get

# アプリ実行
flutter run

# テスト実行
flutter test

# 静的解析
flutter analyze

# コードフォーマット
dart format lib/

# キャッシュクリア
flutter clean
```

### トラブルシューティング

```bash
# 完全な再ビルド
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs

# iOS関連の問題
rm -rf ios/Pods ios/Podfile.lock
cd ios && pod install && cd ..
```

## テスト

### 現状

- `test/widget_test.dart` - 基本的なウィジェットテスト（最小限）

### テスト実行

```bash
flutter test
```

### テスト作成時の注意

- テストファイルは`test/`ディレクトリ配下に配置
- ファイル名は`*_test.dart`形式
- features層はUI無しでテスト可能

## CI/CD

### GitHub Actions ワークフロー

1. **deploy.yml** - GitHub Pages自動デプロイ
   - トリガー: mainブランチへのpush
   - Flutter 3.24.0でWebビルド
   - gh-pagesブランチにデプロイ

2. **claude.yml** - Claude Code統合
   - トリガー: PRコメント、レビュー

### デプロイURL

https://shoma4646.github.io/guitar_lovers/

## 依存関係

### 主要パッケージ

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| flutter_riverpod | ^2.5.1 | 状態管理 |
| riverpod_annotation | ^2.3.5 | コード生成アノテーション |
| go_router | ^14.2.0 | ルーティング |
| shared_preferences | ^2.2.3 | ローカルストレージ |
| pitch_detector_dart | ^0.0.7 | ピッチ検出 |
| fl_chart | ^0.69.0 | グラフ表示 |
| share_plus | ^10.1.2 | SNSシェア |

### dev依存関係

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| build_runner | ^2.4.9 | コード生成実行 |
| riverpod_generator | ^2.4.0 | Providerコード生成 |
| flutter_lints | ^3.0.0 | Linter |

## カラーパレット

```dart
// lib/shared/constants/app_colors.dart
backgroundDark: #1A1A1A
backgroundLightDark: #2A2A2A
backgroundGrey: #333333
primary (green): #4CAF50
error: #F44336
textPrimary: #FFFFFF
textSecondary: #888888
```

## 重要な注意事項

### AI開発時の注意点

1. **コード生成を忘れない**: `@riverpod`アノテーションを変更したら必ず`build_runner`を実行
2. **依存関係の方向を守る**: presentation → features の一方向のみ
3. **イミュータブルを維持**: モデルクラスは`const`コンストラクタと`copyWith()`を使用
4. **日本語でコミュニケーション**: すべてのレビュー、コメント、コミットメッセージは日本語
5. **生成ファイルを編集しない**: `.g.dart`ファイルは自動生成されるため手動編集禁止

### 既知の問題

- **YouTube Player**: Flutter SDKとの互換性問題で一部環境でコンパイルエラー
- **チューナー**: 現在デモモード（実音声入力は未実装）
- **テスト**: カバレッジが最小限（拡充が必要）

### ファイル作成時のルール

1. 新しい機能は`lib/features/[機能名]/`に追加
2. UIは`lib/presentation/screens/[機能名]/`に追加
3. 共通UIコンポーネントは`lib/presentation/widgets/`に追加
4. 新しいProviderは`application/`ディレクトリに配置

## ドキュメント

- **README.md**: プロジェクト概要、セットアップ手順
- **docs/design.md**: 設計方針と技術選定
- **docs/flutter_basics.md**: Flutter基礎ガイド
- **.tmp/task.md**: タスク管理

## 学習リソース

- [Flutter公式ドキュメント](https://docs.flutter.dev/)
- [Riverpod公式ドキュメント](https://riverpod.dev/)
- [Material Design 3](https://m3.material.io/)
