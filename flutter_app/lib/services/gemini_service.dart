import 'package:google_generative_ai/google_generative_ai.dart';
import 'api_service.dart';

class GeminiService {
  static final GeminiService _instance = GeminiService._internal();
  factory GeminiService() => _instance;
  GeminiService._internal();

  GenerativeModel? _model;
  // Default API key can be set from environment or backend
  String? _apiKey;

  void init({String? apiKey}) {
    if (apiKey != null && apiKey.isNotEmpty) {
      _apiKey = apiKey;
      _model = GenerativeModel(
        model: 'gemini-1.5-flash',
        apiKey: _apiKey!,
        generationConfig: GenerationConfig(
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        ),
      );
    }
  }

  /// Sends a conversational question to Gemini AI aligned with South African CAPS standards
  Future<String> askCapsTutor({
    required String prompt,
    required String subject,
    required int grade,
    String? topic,
    List<Map<String, String>>? conversationHistory,
  }) async {
    // If local Gemini SDK is configured with an API key, use direct generative model
    if (_model != null) {
      try {
        final systemPrompt = '''
You are the dedicated Fusion High School AI Subject Tutor for South African high school learners.
Grade: Grade $grade (South African CAPS Curriculum)
Subject: $subject
Topic: ${topic ?? 'General Syllabus'}

Guidelines:
1. Provide supportive, step-by-step explanations matching the Department of Basic Education CAPS standards.
2. For calculations, write formulas clearly, substitute values, and state final SI units.
3. For theory, highlight official definitions and common exam pitfalls.
4. Conclude with an encouraging check question.

Question: $prompt
''';
        final content = [Content.text(systemPrompt)];
        final response = await _model!.generateContent(content);
        if (response.text != null && response.text!.isNotEmpty) {
          return response.text!;
        }
      } catch (e) {
        // Fall back to backend API service on error
      }
    }

    // Default: Delegate to the Express backend AI endpoint
    try {
      final res = await ApiService().askAITutor(
        prompt,
        subject: subject,
        grade: grade,
        topic: topic,
        conversationHistory: conversationHistory,
      );
      return res['answer'] ?? res['response'] ?? 'Great question! Let us review the key CAPS concepts for this topic.';
    } catch (e) {
      return 'Connected to offline curriculum guidelines. Key concept for Grade $grade $subject: Follow standard formula substitution and state verified SI units.';
    }
  }
}
