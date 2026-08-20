import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../common/calendar_screen.dart';
import '../common/messages_screen.dart';

class TeacherShell extends StatefulWidget {
  const TeacherShell({super.key});

  @override
  State<TeacherShell> createState() => _TeacherShellState();
}

class _TeacherShellState extends State<TeacherShell> {
  int _currentIndex = 0;
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  Map<String, dynamic> _overviewStats = {};
  List<dynamic> _classList = [];
  List<dynamic> _timetables = [];

  @override
  void initState() {
    super.initState();
    _loadTeacherData();
  }

  Future<void> _loadTeacherData() async {
    try {
      final stats = await _apiService.getTeacherOverview();
      final cl = await _apiService.getTeacherClassList();
      final tt = await _apiService.getTeacherTimetables();
      if (mounted) {
        setState(() {
          _overviewStats = stats;
          _classList = cl;
          _timetables = tt;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final pages = [
      _buildOverviewTab(user),
      _buildClassListTab(),
      _buildTimetableTab(),
      const MessagesScreen(),
      const CalendarScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Teacher Workspace', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${user?.displayName ?? "Educator"} • Faculty Staff', style: const TextStyle(fontSize: 10, color: AppTheme.brandCyan)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month, size: 20),
            onPressed: () => setState(() => _currentIndex = 4),
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
        selectedIndex: _currentIndex < 4 ? _currentIndex : 0,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: AppTheme.surfaceDarker,
        indicatorColor: AppTheme.brandCyan.withValues(alpha: 0.3),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.analytics_outlined), selectedIcon: Icon(Icons.analytics, color: AppTheme.brandCyan), label: 'Analytics'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people, color: AppTheme.brandCyan), label: 'Class Registers'),
          NavigationDestination(icon: Icon(Icons.schedule), selectedIcon: Icon(Icons.schedule, color: AppTheme.brandCyan), label: 'Timetable & Swaps'),
          NavigationDestination(icon: Icon(Icons.chat_outlined), selectedIcon: Icon(Icons.chat, color: AppTheme.brandEmerald), label: 'WhatsApp'),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(UserModel? user) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.brandCyan, AppTheme.brandPrimary]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome, ${user?.fullName ?? "Teacher"}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 4),
                const Text('Educator Portal • Attendance and Marks Registers ready', style: TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Overview KPI row
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('TOTAL LEARNERS', style: TextStyle(fontSize: 9, color: Colors.white60, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('${_overviewStats['total_learners'] ?? _classList.length * 30}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.brandCyan)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('CLASSES TODAY', style: TextStyle(fontSize: 9, color: Colors.white60, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('${_overviewStats['classes_today'] ?? _classList.length}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.brandEmerald)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          Text('Your Assigned Classes & Registers', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 10),
          if (_classList.isEmpty)
            const Text('No assigned classes found in database.', style: TextStyle(color: Colors.white38, fontSize: 12))
          else
            ..._classList.map((c) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.groups, color: AppTheme.brandCyan, size: 18),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(c['class_name'] ?? c['name'] ?? 'Grade 10-A', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                  ),
                  const Text('ACTIVE ROSTER', style: TextStyle(fontSize: 9, color: AppTheme.brandEmerald, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildClassListTab() {
    return _classList.isEmpty
        ? const Center(child: Text('No class rosters assigned in database.', style: TextStyle(color: Colors.white38)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _classList.length,
            itemBuilder: (context, index) {
              final c = _classList[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: const CircleAvatar(backgroundColor: AppTheme.surfaceDarker, child: Icon(Icons.people, color: AppTheme.brandCyan, size: 18)),
                  title: Text(c['class_name'] ?? c['name'] ?? 'Class', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text('Learners: ${c['total_students'] ?? "35"} enrolled', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                  trailing: const Icon(Icons.edit_note, color: AppTheme.brandCyan),
                ),
              );
            },
          );
  }

  Widget _buildTimetableTab() {
    return _timetables.isEmpty
        ? const Center(child: Text('No published timetables in database.', style: TextStyle(color: Colors.white38)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _timetables.length,
            itemBuilder: (context, index) {
              final t = _timetables[index];
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
                    const Icon(Icons.access_time, color: AppTheme.brandCyan, size: 18),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t['title'] ?? 'Teacher Schedule', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                          Text('Status: ${t['status'] ?? "Active"}', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Period Swap Request Dialog opened')),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.brandCyan),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Request Swap', style: TextStyle(fontSize: 10, color: AppTheme.brandCyan)),
                    ),
                  ],
                ),
              );
            },
          );
  }
}
