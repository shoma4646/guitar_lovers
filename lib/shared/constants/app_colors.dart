import 'package:flutter/material.dart';

/// アプリケーション全体で使用するカラー定数
class AppColors {
  AppColors._();

  // Backgrounds
  static const Color backgroundDark = Color(0xFF0B0F19); // Deep Navy
  static const Color backgroundLightDark =
      Color(0xFF151A26); // Slightly lighter navy
  static const Color backgroundGray = Color(0xFF2A3040); // Blue-gray for inputs

  // Accents
  static const Color primary = Color(0xFF6C63FF); // Indigo/Violet
  static const Color secondary = Color(0xFF00E5FF); // Cyan accent
  static const Color error = Color(0xFFFF5252); // Soft Red

  // Text
  static const Color textWhite = Color(0xFFFFFFFF);
  static const Color textGray = Color(0xFF8F9BB3);
  static const Color textLightGray = Color(0xFFC5CEE0);

  // Glassmorphism
  static const Color glassBorder = Color(0x33FFFFFF);
  static const Color glassSurface = Color(0x1AFFFFFF);
}
