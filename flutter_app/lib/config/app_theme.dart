import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Midnight Dark (Default)
  static const Color canvasDark = Color(0xFF090D16);
  static const Color surfaceDark = Color(0xFF111827);
  static const Color surfaceDarker = Color(0xFF0B0F19);
  static const Color surfaceElevated = Color(0xFF1F2937);

  // Brand Accents
  static const Color brandPrimary = Color(0xFF4F46E5); // Indigo 600
  static const Color brandSecondary = Color(0xFF6366F1); // Indigo 500
  static const Color brandCyan = Color(0xFF06B6D4); // Cyan 500
  static const Color brandEmerald = Color(0xFF10B981); // Emerald / WhatsApp Green
  static const Color brandAmber = Color(0xFFF59E0B); // Amber
  static const Color brandRose = Color(0xFFF43F5E); // Rose

  // WhatsApp Palette
  static const Color waOutgoingBubble = Color(0xFF005C4B);
  static const Color waIncomingBubble = Color(0xFF202C33);
  static const Color waDarkHeader = Color(0xFF202C33);
  static const Color waBackground = Color(0xFF0B141A);
  static const Color waSidebar = Color(0xFF111B21);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: canvasDark,
      primaryColor: brandPrimary,
      colorScheme: const ColorScheme.dark(
        primary: brandPrimary,
        secondary: brandCyan,
        surface: surfaceDark,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        ThemeData(brightness: Brightness.dark).textTheme,
      ).apply(
        bodyColor: Colors.white,
        displayColor: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: surfaceDarker,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.outfit(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceDark,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.white10),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceDarker,
        hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.white12),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.white12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: brandCyan, width: 1.5),
        ),
      ),
    );
  }
}
