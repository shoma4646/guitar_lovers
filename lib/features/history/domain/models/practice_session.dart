import 'package:uuid/uuid.dart';

/// 練習セッションのデータモデル
class PracticeSession {
  /// セッションID（UUID）
  final String id;

  /// 日時
  final DateTime dateTime;

  /// 練習時間（分）
  final int durationMinutes;

  /// 練習内容（任意）
  final String? notes;

  /// 使用したチューニング（任意）
  final String? tuning;

  const PracticeSession({
    required this.id,
    required this.dateTime,
    required this.durationMinutes,
    this.notes,
    this.tuning,
  });

  /// ファクトリーコンストラクタ：新規セッション作成
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

  /// JSONからデシリアライズ
  factory PracticeSession.fromJson(Map<String, dynamic> json) {
    return PracticeSession(
      id: json['id'] as String,
      dateTime: DateTime.parse(json['dateTime'] as String),
      durationMinutes: json['durationMinutes'] as int,
      notes: json['notes'] as String?,
      tuning: json['tuning'] as String?,
    );
  }

  /// JSONへシリアライズ
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'dateTime': dateTime.toIso8601String(),
      'durationMinutes': durationMinutes,
      'notes': notes,
      'tuning': tuning,
    };
  }

  /// コピーメソッド
  PracticeSession copyWith({
    String? id,
    DateTime? dateTime,
    int? durationMinutes,
    String? notes,
    String? tuning,
  }) {
    return PracticeSession(
      id: id ?? this.id,
      dateTime: dateTime ?? this.dateTime,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      notes: notes ?? this.notes,
      tuning: tuning ?? this.tuning,
    );
  }
}
