import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/models.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('userRole');
  }

  Map<String, String> _headers({bool requiresAuth = true}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth && _token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  // --- Auth APIs ---
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final isEmail = identifier.contains('@');
    final body = jsonEncode(isEmail
        ? {'email': identifier.trim(), 'password': password}
        : {'learnerNumber': identifier.trim(), 'password': password});

    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/login'),
      headers: _headers(requiresAuth: false),
      body: body,
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final token = data['token'];
      if (token != null) {
        await setToken(token);
      }
      return data;
    } else {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? err['message'] ?? 'Login failed');
    }
  }

  Future<UserModel> getProfile() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/profile'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return UserModel.fromJson(data['user'] ?? data);
    }
    throw Exception('Failed to load profile');
  }

  // --- WhatsApp Messages APIs ---
  Future<List<ContactModel>> getContacts() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/messages/contacts'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((c) => ContactModel.fromJson(c)).toList();
    }
    return [];
  }

  Future<List<MessageModel>> getConversation(dynamic recipientId, dynamic myUserId) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/messages/conversation/$recipientId'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((m) => MessageModel.fromJson(m, myUserId)).toList();
    }
    return [];
  }

  Future<void> sendMessage(dynamic receiverId, String content) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/messages'),
      headers: _headers(),
      body: jsonEncode({
        'receiver_id': receiverId,
        'content': content,
      }),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to send message');
    }
  }

  // --- School Calendar Events APIs ---
  Future<List<EventModel>> getEvents() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/events'),
      headers: _headers(),
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((e) => EventModel.fromJson(e)).toList();
    }
    return [];
  }

  Future<void> createEvent(Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/events'),
      headers: _headers(),
      body: jsonEncode(payload),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to create calendar event');
    }
  }

  // --- Learner Portal APIs ---
  Future<List<dynamic>> getLearnerSubjects() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/learner/subjects'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return [];
  }

  Future<Map<String, dynamic>> askAITutor(
    String prompt, {
    String? subject,
    String? topic,
    int? grade,
    List<Map<String, String>>? conversationHistory,
  }) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/learner/ask-tutor'),
      headers: _headers(),
      body: jsonEncode({
        'prompt': prompt,
        'subject': subject,
        'topic': topic,
        'grade': grade,
        'conversationHistory': conversationHistory,
      }),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('AI Study Tutor error');
  }

  Future<Map<String, dynamic>> getLearnerTimetable() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/learner/timetable'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return {};
  }

  // --- Teacher Portal APIs ---
  Future<Map<String, dynamic>> getTeacherOverview() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/teacher/overview-stats'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return {};
  }

  Future<List<dynamic>> getTeacherClassList() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/teacher/classlist'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return [];
  }

  Future<List<dynamic>> getTeacherTimetables() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/teacher/timetables'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return [];
  }

  Future<void> createSwapRequest(Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/teacher/timetable/swap-request'),
      headers: _headers(),
      body: jsonEncode(payload),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to submit swap request');
    }
  }

  // --- Parent Portal APIs ---
  Future<Map<String, dynamic>> getParentOverview() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/parent/overview'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return {};
  }

  Future<List<dynamic>> getParentChildren() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/parent/children-detailed'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return [];
  }

  // --- Admin Portal APIs ---
  Future<Map<String, dynamic>> getAdminStats() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/admin/stats'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return {};
  }

  Future<List<dynamic>> getAdminUsers() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/admin/users'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return [];
  }

  // --- Announcements API ---
  Future<List<dynamic>> getAnnouncements() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/announcements'),
      headers: _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    return [];
  }
}
