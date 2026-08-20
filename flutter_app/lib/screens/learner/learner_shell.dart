import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../common/calendar_screen.dart';
import '../common/messages_screen.dart';

class LearnerShell extends StatefulWidget {
  const LearnerShell({super.key});

  @override
  State<LearnerShell> createState() => _LearnerShellState();
}

class _LearnerShellState extends State<LearnerShell> {
  int _currentIndex = 0;
  final ApiService _apiService = ApiService();

  // Tab 0: Overview State
  bool _isLoadingOverview = true;
  List<dynamic> _subjects = [];
  Map<String, dynamic> _timetable = {};

  // Tab 2: AI Tutor Chat State
  String? _selectedAiSubject;
  final TextEditingController _aiInputController = TextEditingController();
  final List<Map<String, String>> _aiChatLog = [];
  bool _isAiThinking = false;

  @override
  void initState() {
    super.initState();
    _loadOverviewData();
  }

  @override
  void dispose() {
    _aiInputController.dispose();
    super.dispose();
  }

  Future<void> _loadOverviewData() async {
    try {
      final subs = await _apiService.getLearnerSubjects();
      final tt = await _apiService.getLearnerTimetable();
      if (mounted) {
        setState(() {
          _subjects = subs;
          _timetable = tt;
          if (_subjects.isNotEmpty && _selectedAiSubject == null) {
            _selectedAiSubject = _subjects[0]['name'] ?? _subjects[0]['subject_name'] ?? 'Mathematics';
          }
          _isLoadingOverview = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingOverview = false);
    }
  }

  void _sendAiPrompt([String? promptOverride]) async {
    final text = (promptOverride ?? _aiInputController.text).trim();
    if (text.isEmpty || _isAiThinking) return;

    setState(() {
      _aiChatLog.add({'sender': 'learner', 'text': text});
      _isAiThinking = true;
    });
    if (promptOverride == null) _aiInputController.clear();

    try {
      final grade = context.read<AuthProvider>().user?.grade ?? 11;
      final res = await _apiService.askAITutor(
        text,
        subject: _selectedAiSubject ?? 'Mathematics',
        grade: grade,
        conversationHistory: _aiChatLog,
      );
      final responseText = res['response'] ?? res['answer'] ?? res['message'] ?? 'Unable to parse AI answer.';
      if (mounted) {
        setState(() {
          _aiChatLog.add({'sender': 'ai', 'text': responseText});
          _isAiThinking = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _aiChatLog.add({'sender': 'ai', 'text': 'I had trouble connecting to the tutor engine. Please ensure the backend server is running and try again.'});
          _isAiThinking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final pages = [
      _buildOverviewTab(user),
      _buildSubjectsTab(),
      _buildAiTutorTab(),
      _buildTimetableTab(),
      const MessagesScreen(),
      const CalendarScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Learner Portal', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${user?.displayName ?? "Student"} • Grade ${user?.grade ?? 11}', style: const TextStyle(fontSize: 10, color: AppTheme.brandCyan)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month, size: 20),
            onPressed: () => setState(() => _currentIndex = 5),
            tooltip: 'School Calendar',
          ),
          IconButton(
            icon: const Icon(Icons.logout, size: 20, color: AppTheme.brandRose),
            onPressed: () async {
              await auth.logout();
              if (context.mounted) Navigator.pushReplacementNamed(context, '/');
            },
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex < 5 ? _currentIndex : 0,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: AppTheme.surfaceDarker,
        indicatorColor: AppTheme.brandPrimary.withValues(alpha: 0.3),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard, color: AppTheme.brandCyan), label: 'Overview'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book, color: AppTheme.brandCyan), label: 'Subjects'),
          NavigationDestination(icon: Icon(Icons.psychology_outlined), selectedIcon: Icon(Icons.psychology, color: AppTheme.brandCyan), label: 'AI Tutor'),
          NavigationDestination(icon: Icon(Icons.access_time), selectedIcon: Icon(Icons.access_time_filled, color: AppTheme.brandCyan), label: 'Timetable'),
          NavigationDestination(icon: Icon(Icons.chat_outlined), selectedIcon: Icon(Icons.chat, color: AppTheme.brandEmerald), label: 'WhatsApp'),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(UserModel? user) {
    if (_isLoadingOverview) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.brandPrimary, AppTheme.brandSecondary]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Welcome back, ${user?.fullName ?? "Learner"}!', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text('Grade ${user?.grade ?? 11} NSC Curriculum • All modules active', style: const TextStyle(fontSize: 11, color: Colors.white70)),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () => setState(() => _currentIndex = 2),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppTheme.brandPrimary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.psychology, size: 14, color: AppTheme.brandPrimary),
                  label: const Text('Ask AI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Enrolled Subjects List from Database
          Text('Enrolled CAPS Subjects', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 10),
          if (_subjects.isEmpty)
            const Text('No subjects loaded from database.', style: TextStyle(color: Colors.white38, fontSize: 12))
          else
            ..._subjects.map((s) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.book, color: AppTheme.brandCyan, size: 18),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(s['name'] ?? s['subject_name'] ?? 'Subject', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                  ),
                  const Text('CAPS', style: TextStyle(fontSize: 10, color: AppTheme.brandEmerald, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildSubjectsTab() {
    return _subjects.isEmpty
        ? const Center(child: Text('No subjects enrolled in database.', style: TextStyle(color: Colors.white38)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _subjects.length,
            itemBuilder: (context, index) {
              final sub = _subjects[index];
              final subName = sub['name'] ?? sub['subject_name'] ?? 'Subject';
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: const CircleAvatar(backgroundColor: AppTheme.surfaceDarker, child: Icon(Icons.menu_book, color: AppTheme.brandCyan, size: 18)),
                  title: Text(subName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text('Code: ${sub['code'] ?? "NSC-CAPS"} • Stream: ${sub['stream'] ?? "Core"}', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                  trailing: ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        _selectedAiSubject = subName;
                        _currentIndex = 2; // Jump to AI Tutor
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandPrimary.withValues(alpha: 0.2),
                      foregroundColor: AppTheme.brandCyan,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    ),
                    icon: const Icon(Icons.psychology, size: 12, color: AppTheme.brandCyan),
                    label: const Text('Tutor', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
              );
            },
          );
  }

  Widget _buildAiTutorTab() {
    final subName = _selectedAiSubject ?? 'Mathematics';

    return Column(
      children: [
        // Subject Selector Header Strip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: AppTheme.surfaceDarker,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.psychology, color: AppTheme.brandCyan, size: 16),
                  const SizedBox(width: 6),
                  Text('Conversational Tutor • Subject:', style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.bold)),
                  const Spacer(),
                  if (_aiChatLog.isNotEmpty)
                    TextButton(
                      onPressed: () => setState(() => _aiChatLog.clear()),
                      child: const Text('Clear Chat', style: TextStyle(fontSize: 10, color: AppTheme.brandRose)),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _subjects.map((s) {
                    final name = s['name'] ?? s['subject_name'] ?? 'Subject';
                    final isSelected = _selectedAiSubject == name;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(name, style: TextStyle(fontSize: 10, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? Colors.white : Colors.white60)),
                        selected: isSelected,
                        selectedColor: AppTheme.brandPrimary,
                        backgroundColor: AppTheme.surfaceDark,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        onSelected: (_) => setState(() => _selectedAiSubject = name),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),

        // Chat Message Log
        Expanded(
          child: _aiChatLog.isEmpty
              ? Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.brandPrimary.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.school, size: 40, color: AppTheme.brandCyan),
                        ),
                        const SizedBox(height: 12),
                        Text('Conversational CAPS Tutor: $subName', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                        const SizedBox(height: 6),
                        Text('Ask anything about $subName and get step-by-step guidance!', style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        // Quick prompt starters for the active subject
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            ActionChip(
                              label: Text('Explain core $subName formulas', style: const TextStyle(fontSize: 11)),
                              backgroundColor: AppTheme.surfaceDark,
                              onPressed: () => _sendAiPrompt('Please explain the key formulas and concepts for $subName step-by-step.'),
                            ),
                            ActionChip(
                              label: const Text('Give me a 3-question quiz', style: TextStyle(fontSize: 11)),
                              backgroundColor: AppTheme.surfaceDark,
                              onPressed: () => _sendAiPrompt('Give me a 3-question multiple choice practice quiz for $subName with solutions.'),
                            ),
                            ActionChip(
                              label: const Text('Past exam tips & pitfalls', style: TextStyle(fontSize: 11)),
                              backgroundColor: AppTheme.surfaceDark,
                              onPressed: () => _sendAiPrompt('What are common exam mistakes in $subName and how can I score full marks?'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _aiChatLog.length,
                  itemBuilder: (context, index) {
                    final item = _aiChatLog[index];
                    final isMe = item['sender'] == 'learner';

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(14),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                        decoration: BoxDecoration(
                          color: isMe ? AppTheme.brandPrimary : AppTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(16),
                          border: isMe ? null : Border.all(color: AppTheme.brandCyan.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (!isMe)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.psychology, size: 12, color: AppTheme.brandCyan),
                                    const SizedBox(width: 4),
                                    Text('$subName Tutor', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.brandCyan)),
                                  ],
                                ),
                              ),
                            Text(item['text'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.white, height: 1.4)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),

        // Input Box
        Container(
          padding: const EdgeInsets.all(8),
          color: AppTheme.surfaceDarker,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _aiInputController,
                  decoration: InputDecoration(
                    hintText: 'Ask $subName question...',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  onSubmitted: (_) => _sendAiPrompt(),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                backgroundColor: AppTheme.brandAmber,
                child: IconButton(
                  icon: _isAiThinking
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(Icons.send, size: 16, color: Colors.black),
                  onPressed: _isAiThinking ? null : () => _sendAiPrompt(),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimetableTab() {
    final periods = _timetable['periods'] as List? ?? [];
    if (periods.isEmpty) {
      return const Center(child: Text('No timetable entries in database for your class.', style: TextStyle(color: Colors.white38)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: periods.length,
      itemBuilder: (context, index) {
        final p = periods[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white10),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: AppTheme.brandPrimary.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                child: Text('P${p['period_number'] ?? index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.brandCyan, fontFamily: 'monospace')),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p['subject_name'] ?? 'Class Period', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                    Text('Teacher: ${p['teacher_name'] ?? "Educator"} • Room ${p['room'] ?? "101"}', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
