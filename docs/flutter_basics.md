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

### Provider(読み取り専用)

変更されないデータを提供します。

```dart
// プロバイダーの定義
final greetingProvider = Provider<String>((ref) {
  return 'Hello, World!';
});

// 使用例
class GreetingScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // プロバイダーから値を取得
    final greeting = ref.watch(greetingProvider);

    return Text(greeting);  // Hello, World!
  }
}
```

### StateNotifierProvider(状態変更可能)

ユーザーの操作で変化する状態を管理します。

```dart
// 状態を管理するクラス
class CounterNotifier extends StateNotifier<int> {
  CounterNotifier() : super(0);  // 初期値0

  void increment() {
    state++;  // 状態を更新
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
    // 状態を取得(変更を監視)
    final count = ref.watch(counterProvider);

    return Column(
      children: [
        Text('Count: $count'),
        ElevatedButton(
          onPressed: () {
            // 状態を変更
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

## よく使うパターン

### リストの表示

```dart
class NewsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(newsProvider);

    return ListView.builder(
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
