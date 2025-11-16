# Flutter基礎ガイド

このドキュメントは、Flutter初学者が「Guitar Lovers」プロジェクトのコードを理解するために必要な基礎知識をまとめたものです。

## 目次

1. [Flutterとは](#flutterとは)
2. [Dartの基本](#dartの基本)
3. [ウィジェット](#ウィジェット)
4. [状態管理(Riverpod)](#状態管理riverpod)
5. [レイアウト](#レイアウト)
6. [ナビゲーション](#ナビゲーション)
7. [アニメーション](#アニメーション)
8. [非同期処理](#非同期処理)
9. [デザインパターン](#デザインパターン)
10. [よく使うパターン](#よく使うパターン)

---

## Flutterとは

**Flutter**は、Googleが開発したクロスプラットフォームのUIフレームワークです。

### 特徴

- **1つのコードベース**で複数のプラットフォーム(iOS、Android、Web、デスクトップ)に対応
- **高速な開発**: ホットリロードで即座に変更を確認
- **美しいUI**: Material DesignとCupertinoウィジェットを標準搭載
- **ネイティブパフォーマンス**: C++エンジンで高速に動作

### プロジェクト構成

```
guitar_lovers_flutter/
├── lib/                 # Dartソースコード
│   ├── main.dart       # エントリーポイント
│   ├── features/       # 画面
│   ├── models/         # データモデル
│   └── providers/      # 状態管理
├── ios/                # iOS固有の設定
├── android/            # Android固有の設定
├── web/                # Web固有の設定
├── test/               # テストコード
└── pubspec.yaml        # パッケージ管理ファイル
```

---

## Dartの基本

FlutterはDart言語で書かれています。JavaScriptやTypeScriptに似た構文です。

### 変数宣言

```dart
// 型推論(推奨)
var name = 'John';
final age = 30;          // 再代入不可
const pi = 3.14;         // コンパイル時定数

// 明示的な型指定
String title = 'Guitar Lovers';
int count = 5;
double price = 99.99;
bool isActive = true;
```

### Null Safety

Dartは**Null Safety**(null安全性)をサポートしています。

```dart
// Null許容型(?)
String? nickname;        // nullになる可能性がある
nickname = null;         // OK

// Null非許容型
String username = 'Alice';
// username = null;      // エラー!

// Null合体演算子
String displayName = nickname ?? 'Guest';  // nicknameがnullなら'Guest'
```

### クラス

```dart
class User {
  final String id;
  final String name;
  final int age;

  // コンストラクタ
  const User({
    required this.id,
    required this.name,
    required this.age,
  });

  // メソッド
  bool isAdult() {
    return age >= 18;
  }
}

// 使用例
final user = User(id: '1', name: 'Alice', age: 25);
print(user.name);  // Alice
```

### コレクション

```dart
// リスト
List<String> fruits = ['Apple', 'Banana', 'Orange'];
fruits.add('Grape');
print(fruits[0]);  // Apple

// マップ
Map<String, int> scores = {
  'Alice': 90,
  'Bob': 85,
};
scores['Charlie'] = 95;
print(scores['Alice']);  // 90

// セット
Set<int> numbers = {1, 2, 3, 3};  // {1, 2, 3} 重複は削除される
```

---

## ウィジェット

Flutterではすべてが**ウィジェット**です。画面、ボタン、テキスト、レイアウトなど、すべてウィジェットで構成されます。

### StatelessWidget(状態を持たない)

再描画されても内部状態が変わらないウィジェットです。

```dart
class Greeting extends StatelessWidget {
  final String name;

  const Greeting({required this.name, super.key});

  @override
  Widget build(BuildContext context) {
    return Text('Hello, $name!');
  }
}

// 使用例
Greeting(name: 'Alice')
```

### StatefulWidget(状態を持つ)

ユーザーの操作などで内部状態が変化するウィジェットです。

```dart
class Counter extends StatefulWidget {
  const Counter({super.key});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  void _increment() {
    setState(() {
      _count++;  // setStateで状態を更新すると再描画される
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: $_count'),
        ElevatedButton(
          onPressed: _increment,
          child: const Text('Increment'),
        ),
      ],
    );
  }
}
```

### よく使うウィジェット

#### レイアウト

```dart
// 縦に並べる
Column(
  children: [
    Text('Item 1'),
    Text('Item 2'),
    Text('Item 3'),
  ],
)

// 横に並べる
Row(
  children: [
    Icon(Icons.star),
    Text('5.0'),
  ],
)

// 重ねる
Stack(
  children: [
    Container(color: Colors.blue),
    Positioned(
      top: 10,
      left: 10,
      child: Text('Overlay'),
    ),
  ],
)
```

#### UI要素

```dart
// テキスト
Text(
  'Hello World',
  style: TextStyle(fontSize: 20, color: Colors.blue),
)

// ボタン
ElevatedButton(
  onPressed: () {
    print('Tapped!');
  },
  child: Text('Click Me'),
)

// 画像
Image.network('https://example.com/image.png')

// アイコン
Icon(Icons.favorite, color: Colors.red)

// 入力フィールド
TextField(
  decoration: InputDecoration(
    hintText: 'Enter your name',
  ),
  onChanged: (value) {
    print('Input: $value');
  },
)
```

---

## 状態管理(Riverpod)

**Riverpod**は、アプリ全体で状態を管理するための強力なライブラリです。

### なぜ状態管理が必要か?

複数の画面で同じデータを共有したい場合、親から子へとデータを渡していくのは大変です。Riverpodを使えば、どの画面からでも同じデータにアクセスできます。

```
アプリ全体の状態
    ↓
[画面A] [画面B] [画面C]
すべての画面が同じ状態にアクセス可能
```

### Riverpod Generator(推奨)

**Riverpod Generator**は、アノテーションを使ってプロバイダーを自動生成するツールです。このプロジェクトでは**Riverpod Generatorを使用することを推奨**します。

#### セットアップ

```yaml
# pubspec.yaml
dependencies:
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

dev_dependencies:
  build_runner: ^2.4.9
  riverpod_generator: ^2.4.0
```

#### 基本的な使い方

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

// part文を追加(ファイル名と同じ)
part 'counter_provider.g.dart';

// シンプルなプロバイダー
@riverpod
String greeting(Ref ref) {
  return 'Hello, World!';
}

// 非同期プロバイダー
@riverpod
Future<String> userName(Ref ref) async {
  await Future.delayed(Duration(seconds: 1));
  return 'Alice';
}

// 状態を持つプロバイダー(クラスベース)
@riverpod
class Counter extends _$Counter {
  @override
  int build() {
    return 0;  // 初期値
  }

  void increment() {
    state++;
  }

  void decrement() {
    state--;
  }

  void reset() {
    state = 0;
  }
}
```

#### コード生成コマンド

```bash
# 1回だけ生成
flutter pub run build_runner build

# 変更を監視して自動生成(開発中に便利)
flutter pub run build_runner watch

# 既存の生成ファイルを削除して再生成
flutter pub run build_runner build --delete-conflicting-outputs
```

#### 実際の使用例

```dart
class CounterScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 自動生成されたプロバイダー名: 元の名前 + Provider
    final count = ref.watch(counterProvider);

    return Column(
      children: [
        Text('Count: $count'),
        ElevatedButton(
          onPressed: () {
            // notifierを取得してメソッドを呼び出す
            ref.read(counterProvider.notifier).increment();
          },
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

#### パラメータを受け取るプロバイダー

```dart
@riverpod
Future<User> user(Ref ref, String userId) async {
  // userIdを使ってユーザー情報を取得
  return await fetchUser(userId);
}

// 使用例
class UserProfile extends ConsumerWidget {
  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // パラメータを渡して使用
    final userAsync = ref.watch(userProvider(userId));

    return userAsync.when(
      data: (user) => Text(user.name),
      loading: () => CircularProgressIndicator(),
      error: (err, stack) => Text('Error: $err'),
    );
  }
}
```

### 従来の方法(Provider、StateNotifierProvider)

Riverpod Generatorを使わない場合の従来の書き方です。

#### Provider(読み取り専用)

```dart
// プロバイダーの定義
final greetingProvider = Provider<String>((ref) {
  return 'Hello, World!';
});

// 使用例
class GreetingScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final greeting = ref.watch(greetingProvider);
    return Text(greeting);
  }
}
```

#### StateNotifierProvider(状態変更可能)

```dart
// 状態を管理するクラス
class CounterNotifier extends StateNotifier<int> {
  CounterNotifier() : super(0);

  void increment() {
    state++;
  }

  void decrement() {
    state--;
  }

  void reset() {
    state = 0;
  }
}

// プロバイダーの定義
final counterProvider = StateNotifierProvider<CounterNotifier, int>((ref) {
  return CounterNotifier();
});

// 使用例
class CounterScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);

    return Column(
      children: [
        Text('Count: $count'),
        ElevatedButton(
          onPressed: () {
            ref.read(counterProvider.notifier).increment();
          },
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

### ConsumerWidgetとConsumerStatefulWidget

Riverpodを使う際は、`StatelessWidget`の代わりに`ConsumerWidget`を使います。

```dart
// StatelessWidget → ConsumerWidget
class NewsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(newsProvider);
    return ListView(...);
  }
}

// StatefulWidget → ConsumerStatefulWidget
class CommunityScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends ConsumerState<CommunityScreen> {
  @override
  Widget build(BuildContext context) {
    final posts = ref.watch(communityProvider);
    return ListView(...);
  }
}
```

### ref.watchとref.read

```dart
// ref.watch: 値の変更を監視して自動で再描画
final count = ref.watch(counterProvider);

// ref.read: 値を1回だけ取得(再描画しない)
// ボタンのonPressedなど、イベント内で使用
onPressed: () {
  ref.read(counterProvider.notifier).increment();
}
```

---

## レイアウト

### Container

最も基本的なレイアウトウィジェットです。

```dart
Container(
  width: 200,
  height: 100,
  padding: EdgeInsets.all(16),
  margin: EdgeInsets.symmetric(horizontal: 20),
  decoration: BoxDecoration(
    color: Colors.blue,
    borderRadius: BorderRadius.circular(8),
    boxShadow: [
      BoxShadow(
        color: Colors.black26,
        blurRadius: 4,
        offset: Offset(2, 2),
      ),
    ],
  ),
  child: Text('Hello'),
)
```

### Column / Row

子ウィジェットを縦または横に並べます。

```dart
Column(
  mainAxisAlignment: MainAxisAlignment.center,  // 縦方向の配置
  crossAxisAlignment: CrossAxisAlignment.start,  // 横方向の配置
  children: [
    Text('Item 1'),
    Text('Item 2'),
    Text('Item 3'),
  ],
)
```

### Expanded / Flexible

利用可能なスペースを埋めます。

```dart
Row(
  children: [
    Text('Left'),
    Expanded(
      child: Container(color: Colors.blue),  // 残りのスペースを埋める
    ),
    Text('Right'),
  ],
)
```

### ListView

スクロール可能なリストを作成します。

```dart
// 固定リスト
ListView(
  children: [
    ListTile(title: Text('Item 1')),
    ListTile(title: Text('Item 2')),
    ListTile(title: Text('Item 3')),
  ],
)

// 動的リスト(大量のデータに最適)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(
      title: Text(items[index]),
    );
  },
)
```

### SingleChildScrollView

単一の子ウィジェットをスクロール可能にします。

```dart
SingleChildScrollView(
  child: Column(
    children: [
      // 縦に長いコンテンツ
    ],
  ),
)
```

---

## ナビゲーション

### 基本的な画面遷移

```dart
// 次の画面へ移動
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => SecondScreen()),
);

// 前の画面に戻る
Navigator.pop(context);
```

### BottomNavigationBar

タブナビゲーションを実装します(Guitar Loversで使用)。

```dart
Scaffold(
  body: _screens[_currentIndex],  // 現在選択中の画面
  bottomNavigationBar: NavigationBar(
    selectedIndex: _currentIndex,
    onDestinationSelected: (index) {
      setState(() {
        _currentIndex = index;  // タブを切り替え
      });
    },
    destinations: [
      NavigationDestination(
        icon: Icon(Icons.home),
        label: 'Home',
      ),
      NavigationDestination(
        icon: Icon(Icons.search),
        label: 'Search',
      ),
    ],
  ),
)
```

---

## アニメーション

### AnimatedContainer

プロパティの変化を自動的にアニメーション化します。

```dart
AnimatedContainer(
  duration: Duration(milliseconds: 300),
  width: _isExpanded ? 200 : 100,
  height: _isExpanded ? 200 : 100,
  color: _isExpanded ? Colors.blue : Colors.red,
  child: Text('Tap me'),
)
```

### AnimatedOpacity

透明度の変化をアニメーション化します。

```dart
AnimatedOpacity(
  opacity: _isVisible ? 1.0 : 0.0,
  duration: Duration(milliseconds: 500),
  child: Text('Fade in/out'),
)
```

### TweenAnimationBuilder

カスタムアニメーションを作成します。

```dart
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0, end: 100),
  duration: Duration(seconds: 2),
  builder: (context, value, child) {
    return Text('${value.toInt()}%');  // 0%から100%までアニメーション
  },
)
```

### AnimatedSwitcher

子ウィジェットの切り替えをアニメーション化します。

```dart
AnimatedSwitcher(
  duration: Duration(milliseconds: 300),
  child: Text(
    _currentText,
    key: ValueKey(_currentText),  // keyが変わると切り替わる
  ),
)
```

---

## 非同期処理

### Future

非同期処理の結果を表します。

```dart
// 非同期関数
Future<String> fetchUserName() async {
  await Future.delayed(Duration(seconds: 2));  // 2秒待つ
  return 'Alice';
}

// 使用例
void loadUser() async {
  final name = await fetchUserName();
  print(name);  // 2秒後に'Alice'が表示される
}
```

### FutureBuilder

Futureの結果に応じてUIを構築します。

```dart
FutureBuilder<String>(
  future: fetchUserName(),
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return CircularProgressIndicator();  // ローディング中
    }

    if (snapshot.hasError) {
      return Text('Error: ${snapshot.error}');  // エラー発生
    }

    return Text('Name: ${snapshot.data}');  // データ取得成功
  },
)
```

### Stream

連続的なデータの流れを表します。

```dart
// Stream作成
Stream<int> countStream() async* {
  for (int i = 1; i <= 5; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i;  // 1秒ごとに1, 2, 3, 4, 5を送信
  }
}

// StreamBuilder
StreamBuilder<int>(
  stream: countStream(),
  builder: (context, snapshot) {
    if (!snapshot.hasData) {
      return Text('Waiting...');
    }
    return Text('Count: ${snapshot.data}');
  },
)
```

---

## デザインパターン

このプロジェクトで実際に使用しているデザインパターンを紹介します。

### 1. Clean Architecture - Presentation完全分離構成

このプロジェクトの基本構造です。**Presentation層を完全に分離**し、Clean Architectureのベストプラクティスに従っています。

```
lib/
├── features/                     # ビジネスロジック層（UI非依存）
│   ├── tuner/
│   │   ├── domain/              # ドメイン層
│   │   │   ├── pitch_data.dart
│   │   │   └── services/
│   │   ├── data/                # データ層
│   │   │   └── pitch_detector_impl.dart
│   │   └── application/         # アプリケーション層
│   │       └── pitch_detector_provider.dart
│   │
│   ├── history/
│   │   ├── domain/
│   │   ├── data/
│   │   └── application/
│   │
│   ├── practice/
│   └── news/
│
├── presentation/                 # UI層（完全分離）
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
│       └── common/              # 共通UIコンポーネント
│
├── shared/                       # インフラストラクチャ層
│   ├── constants/
│   ├── theme/
│   └── widgets/
│
└── main.dart
```

**各層の役割:**
- **features/**: ビジネスロジック（UI非依存、テスタブル）
  - **domain/**: ドメインモデルとビジネスルール
  - **data/**: データアクセス（Repository実装）
  - **application/**: ユースケースと状態管理（Provider）
- **presentation/**: UI層（完全に分離、再利用可能）
  - **screens/**: 各画面
  - **widgets/**: UIコンポーネント
- **shared/**: 共通インフラストラクチャ

**メリット:**
- **UI層が完全に独立** → デザイン変更が容易
- **ビジネスロジックの再利用** → 複数のUI（Web/Mobile等）で共有可能
- **テスタビリティ** → UI無しでロジックをテスト可能
- **チーム開発** → UI担当とロジック担当で完全分離
- **Clean Architecture準拠** → 業界標準のベストプラクティス
- **依存関係の方向が一方向** → presentation → features（逆は禁止）

### 2. Repository Pattern(リポジトリパターン)

データの取得・保存のロジックを分離するパターンです。

**実際の例: 練習履歴機能**

```dart
// lib/features/history/data/practice_history_repository.dart
class PracticeHistoryRepository {
  final SharedPreferences _prefs;

  PracticeHistoryRepository(this._prefs);

  /// セッション一覧を取得
  Future<List<PracticeSession>> getSessions() async {
    final jsonString = _prefs.getString('practice_sessions') ?? '[]';
    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList.map((json) => PracticeSession.fromJson(json)).toList();
  }

  /// セッションを追加
  Future<void> addSession(PracticeSession session) async {
    final sessions = await getSessions();
    sessions.add(session);
    final jsonString = json.encode(sessions.map((s) => s.toJson()).toList());
    await _prefs.setString('practice_sessions', jsonString);
  }

  /// 統計情報を計算
  Future<PracticeStats> calculateStats() async {
    final sessions = await getSessions();
    // 統計計算のロジック
    return PracticeStats(...);
  }
}

// Riverpodでの使用
@riverpod
Future<PracticeHistoryRepository> practiceHistoryRepository(Ref ref) async {
  final prefs = await ref.watch(sharedPreferencesProvider.future);
  return PracticeHistoryRepository(prefs);
}
```

**メリット:**
- データの保存先(SharedPreferences、API等)を変更してもUI側のコードは変更不要
- データアクセスのロジックが一箇所にまとまる
- テストが書きやすい

### 3. Dependency Injection(依存性注入)

Riverpodを使った依存性の注入パターンです。

**実際の例: 練習履歴機能の層構造**

```dart
// lib/features/history/application/practice_history_provider.dart

// 依存関係: SharedPreferences（インフラ層）
@riverpod
Future<SharedPreferences> sharedPreferences(Ref ref) async {
  return await SharedPreferences.getInstance();
}

// 依存関係: Repository（データ層）
@riverpod
Future<PracticeHistoryRepository> practiceHistoryRepository(Ref ref) async {
  final prefs = await ref.watch(sharedPreferencesProvider.future);
  return PracticeHistoryRepository(prefs);
}

// アプリケーション層: ビジネスロジックと状態管理
@riverpod
class PracticeSessions extends _$PracticeSessions {
  @override
  Future<List<PracticeSession>> build() async {
    // データ層（repository）の実装詳細を知る必要がない
    final repository = await ref.watch(practiceHistoryRepositoryProvider.future);
    return await repository.getSessions();
  }

  // ビジネスロジック：セッション追加
  Future<void> addSession({
    required int durationMinutes,
    String? notes,
  }) async {
    final repository = await ref.read(practiceHistoryRepositoryProvider.future);
    final session = PracticeSession.create(
      durationMinutes: durationMinutes,
      notes: notes,
    );
    await repository.addSession(session);

    // 関連する状態を無効化（自動再取得）
    ref.invalidateSelf();
    ref.invalidate(practiceStatsProvider);
  }
}
```

**プレゼンテーション層での使用**

```dart
// lib/presentation/screens/history/history_screen.dart

class HistoryScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // features層のプロバイダーを監視（presentation → features）
    final sessionsAsync = ref.watch(practiceSessionsProvider);

    return sessionsAsync.when(
      data: (sessions) => ListView.builder(...),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => Text('Error: $error'),
    );
  }
}
```

**重要な依存関係の方向:**
```
presentation/screens/history/history_screen.dart
    ↓ import
features/history/application/practice_history_provider.dart
    ↓
features/history/data/practice_history_repository.dart
    ↓
features/history/domain/practice_session.dart
```

**メリット:**
- **完全な層分離** → UI変更がビジネスロジックに影響しない
- **テスタビリティ** → features層をUI無しでテスト可能
- **データソース変更が容易** → SharedPreferences→Supabase等
- **UI層の再利用** → 同じfeatures層で複数のUI（Web/Mobile）を作成可能
- **依存関係が一方向** → presentation → features（逆は禁止）

### 4. State Management Patterns(状態管理パターン)

#### AsyncValue(非同期状態の処理)

Riverpodの`AsyncValue`を使って、ローディング・成功・エラーを統一的に処理します。

**実際の例: 練習統計の表示**

```dart
// Provider
@riverpod
Future<PracticeStats> practiceStats(Ref ref) async {
  final repository = await ref.watch(practiceHistoryRepositoryProvider.future);
  return await repository.calculateStats();
}

// UI側での使用
class StatsWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(practiceStatsProvider);

    return statsAsync.when(
      data: (stats) => Column(
        children: [
          Text('総練習時間: ${stats.totalMinutes}分'),
          Text('平均時間: ${stats.averageMinutes}分'),
        ],
      ),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => Text('エラー: $error'),
    );
  }
}
```

#### State Invalidation(状態の更新)

データが変更されたときに他のプロバイダーを更新します。

**実際の例: セッション追加時の更新**

```dart
@riverpod
class PracticeSessions extends _$PracticeSessions {
  @override
  Future<List<PracticeSession>> build() async {
    final repository = await ref.watch(practiceHistoryRepositoryProvider.future);
    return await repository.getSessions();
  }

  Future<void> addSession({
    required int durationMinutes,
    String? notes,
  }) async {
    final repository = await ref.read(practiceHistoryRepositoryProvider.future);
    final session = PracticeSession.create(durationMinutes: durationMinutes, notes: notes);
    await repository.addSession(session);

    // 自分自身を無効化して再読み込み
    ref.invalidateSelf();

    // 関連する他のプロバイダーも無効化(統計情報も更新される)
    ref.invalidate(practiceStatsProvider);
    ref.invalidate(weeklyDataProvider);
  }
}
```

### 5. Domain Model Pattern(ドメインモデルパターン)

ビジネスロジックをモデルクラスに持たせるパターンです。

**実際の例: 練習セッション**

```dart
// lib/features/history/domain/practice_session.dart
class PracticeSession {
  final String id;
  final DateTime dateTime;
  final int durationMinutes;
  final String? notes;
  final String? tuning;

  const PracticeSession({
    required this.id,
    required this.dateTime,
    required this.durationMinutes,
    this.notes,
    this.tuning,
  });

  /// セッションを作成(ファクトリーメソッド)
  factory PracticeSession.create({
    required int durationMinutes,
    String? notes,
    String? tuning,
  }) {
    return PracticeSession(
      id: const Uuid().v4(),
      dateTime: DateTime.now(),
      durationMinutes: durationMinutes,
      notes: notes,
      tuning: tuning,
    );
  }

  /// JSONから復元
  factory PracticeSession.fromJson(Map<String, dynamic> json) {
    return PracticeSession(
      id: json['id'] as String,
      dateTime: DateTime.parse(json['dateTime'] as String),
      durationMinutes: json['durationMinutes'] as int,
      notes: json['notes'] as String?,
      tuning: json['tuning'] as String?,
    );
  }

  /// JSONに変換
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'dateTime': dateTime.toIso8601String(),
      'durationMinutes': durationMinutes,
      'notes': notes,
      'tuning': tuning,
    };
  }
}
```

**メリット:**
- データとそれに関連するロジックが一箇所にまとまる
- コードの再利用性が高い
- ビジネスルールが明確になる

---

## よく使うパターン

### リストの表示

```dart
// lib/presentation/screens/news/news_screen.dart
class NewsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // features層のプロバイダーを使用
    final articlesAsync = ref.watch(newsArticlesProvider);

    return articlesAsync.when(
      data: (articles) => ListView.builder(
        itemCount: articles.length,
      itemBuilder: (context, index) {
        final article = articles[index];
        return ListTile(
          leading: Image.network(article.imageUrl),
          title: Text(article.title),
          subtitle: Text(article.excerpt),
          onTap: () {
            // 詳細画面へ遷移
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ArticleDetailScreen(article),
              ),
            );
          },
        );
      },
    );
  }
}
```

### フォーム入力

```dart
class InputForm extends StatefulWidget {
  @override
  State<InputForm> createState() => _InputFormState();
}

class _InputFormState extends State<InputForm> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();  // メモリリーク防止
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            hintText: 'Enter text',
          ),
        ),
        ElevatedButton(
          onPressed: () {
            print(_controller.text);  // 入力値を取得
          },
          child: Text('Submit'),
        ),
      ],
    );
  }
}
```

### Pull to Refresh

```dart
RefreshIndicator(
  onRefresh: () async {
    // データを再取得
    await Future.delayed(Duration(seconds: 2));
  },
  child: ListView(
    children: [...],
  ),
)
```

---

## デバッグのヒント

### print文

```dart
print('Debug: count = $count');
```

### debugPrint

大量のログを出力する際に使用(自動的に分割される)。

```dart
debugPrint('Very long message...');
```

### Flutter DevTools

```bash
# アプリ実行中に利用可能
flutter run
# ブラウザでDevToolsが開く
```

### Hot Reload

コードを変更後、`r`キーを押すと即座に反映されます。

```bash
flutter run
# コードを変更
# r キーを押す → 即座に反映!
```

---

## 次のステップ

1. [公式チュートリアル](https://docs.flutter.dev/get-started/codelab)を試す
2. Guitar Loversのコードを読んで理解を深める
3. 自分で小さなアプリを作ってみる

## 参考リンク

- [Flutter公式ドキュメント](https://docs.flutter.dev/)
- [Dart公式ドキュメント](https://dart.dev/)
- [Riverpod公式ドキュメント](https://riverpod.dev/)
- [Flutter Widget Catalog](https://docs.flutter.dev/ui/widgets)
