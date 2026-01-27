import 'package:flutter_test/flutter_test.dart';
import 'package:guitar_lovers_flutter/features/history/domain/practice_session.dart';

void main() {
  group('PracticeSession', () {
    test('createで正しく生成される', () {
      final session = PracticeSession.create(
        durationMinutes: 30,
        notes: 'テスト練習',
      );

      expect(session.id, isNotEmpty);
      expect(session.durationMinutes, 30);
      expect(session.notes, 'テスト練習');
      expect(session.dateTime, isNotNull);
    });

    test('createでnotesがnullでも生成される', () {
      final session = PracticeSession.create(
        durationMinutes: 15,
      );

      expect(session.durationMinutes, 15);
      expect(session.notes, isNull);
    });

    test('fromJsonとtoJsonが正しく動作する', () {
      final session = PracticeSession.create(
        durationMinutes: 45,
        notes: 'スケール練習',
      );

      final json = session.toJson();
      final restored = PracticeSession.fromJson(json);

      expect(restored.id, session.id);
      expect(restored.durationMinutes, session.durationMinutes);
      expect(restored.notes, session.notes);
      expect(restored.dateTime.toIso8601String(), session.dateTime.toIso8601String());
    });

    test('copyWithが正しく動作する', () {
      final session = PracticeSession.create(
        durationMinutes: 30,
        notes: '元のメモ',
      );

      final updated = session.copyWith(
        durationMinutes: 60,
        notes: '更新されたメモ',
      );

      expect(updated.id, session.id); // IDは変わらない
      expect(updated.durationMinutes, 60);
      expect(updated.notes, '更新されたメモ');
    });

    test('copyWithで一部のみ更新できる', () {
      final session = PracticeSession.create(
        durationMinutes: 30,
        notes: 'メモ',
      );

      final updated = session.copyWith(durationMinutes: 45);

      expect(updated.durationMinutes, 45);
      expect(updated.notes, 'メモ'); // 変更されていない
    });
  });
}
