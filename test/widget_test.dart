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
    expect(find.text('記録'), findsOneWidget);
    expect(find.text('ニュース'), findsOneWidget);
  });

  testWidgets('記録タブへの遷移', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    // 記録タブをタップ
    await tester.tap(find.text('記録'));
    await tester.pumpAndSettle();

    // 記録画面が表示されることを確認(練習履歴のタイトルが表示される)
    expect(find.text('練習履歴'), findsOneWidget);
  });
}
