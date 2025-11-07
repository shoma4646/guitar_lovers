import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:guitar_lovers_flutter/main.dart';

void main() {
  testWidgets('アプリが正常に起動する', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    // アプリタイトルが表示されることを確認
    expect(find.text('Guitar Lovers'), findsOneWidget);

    // 4つのナビゲーションアイテムが表示されることを確認
    expect(find.text('チューナー'), findsOneWidget);
    expect(find.text('練習'), findsOneWidget);
    expect(find.text('コミュニティ'), findsOneWidget);
    expect(find.text('ニュース'), findsOneWidget);
  });

  testWidgets('コミュニティタブへの遷移', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    // コミュニティタブをタップ
    await tester.tap(find.text('コミュニティ'));
    await tester.pump();

    // コミュニティ画面が表示されることを確認
    expect(find.text('投稿を作成...'), findsOneWidget);
  });
}
