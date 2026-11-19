import 'api_service.dart';

class GeminiService {
  static final GeminiService _instance = GeminiService._internal();
  factory GeminiService() => _instance;
  GeminiService._internal();

  void init({String? apiKey}) {
    if (apiKey != null && apiKey.isNotEmpty) {
      // A key typed into the parked app is ignored. Tutor requests go to the school server.
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
    try {
      final res = await ApiService().askAITutor(
        prompt,
        subject: subject,
        grade: grade,
        topic: topic,
        conversationHistory: conversationHistory,
      );
      final answer = res['answer'] ?? res['response'];
      if (answer is String && answer.trim().isNotEmpty) return answer;
      return 'The tutor did not return an answer.';
    } catch (e) {
      return 'The tutor is unavailable right now.';
    }
  }
}
