import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../common/calendar_screen.dart';
import '../common/messages_screen.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({super.key});

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _currentIndex = 0;
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<dynamic> _users = [];

  @override
  void initState() {
    super.initState();
    _loadAdminData();
  }

  Future<void> _loadAdminData() async {
    try {
      final st = await _apiService.getAdminStats();
      final u = await _apiService.getAdminUsers();
      if (mounted) {
        setState(() {
          _stats = st;
          _users = u;
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
      _buildAnalyticsTab(user),
      _buildUsersTab(),
      const MessagesScreen(),
      const CalendarScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Admin Command Center', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${user?.displayName ?? "Administrator"} • Executive Lead', style: const TextStyle(fontSize: 10, color: AppTheme.brandRose)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month, size: 20),
            onPressed: () => setState(() => _currentIndex = 3),
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
        selectedIndex: _currentIndex < 3 ? _currentIndex : 0,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: AppTheme.surfaceDarker,
        indicatorColor: AppTheme.brandRose.withValues(alpha: 0.3),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard, color: AppTheme.brandRose), label: 'Analytics'),
          NavigationDestination(icon: Icon(Icons.group_outlined), selectedIcon: Icon(Icons.group, color: AppTheme.brandRose), label: 'Users'),
          NavigationDestination(icon: Icon(Icons.chat_outlined), selectedIcon: Icon(Icons.chat, color: AppTheme.brandEmerald), label: 'School Chat'),
        ],
      ),
    );
  }

  Widget _buildAnalyticsTab(UserModel? user) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    final totalUsers = _stats['total_users'] ?? _users.length;
    final totalTeachers = _stats['total_teachers'] ?? _users.where((u) => u['role_name'] == 'teacher').length;
    final totalLearners = _stats['total_learners'] ?? _users.where((u) => u['role_name'] == 'learner').length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.brandRose, AppTheme.brandPrimary]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Leadership Intelligence', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 4),
                const Text('Live school-wide enrolment and administrative health metrics', style: TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3 Metric Cards
          Row(
            children: [
              Expanded(child: _buildMetricCard('Total Enrolled', totalLearners.toString(), Icons.school, AppTheme.brandCyan)),
              const SizedBox(width: 10),
              Expanded(child: _buildMetricCard('Faculty Staff', totalTeachers.toString(), Icons.work, AppTheme.brandAmber)),
              const SizedBox(width: 10),
              Expanded(child: _buildMetricCard('Total Users', totalUsers.toString(), Icons.groups, AppTheme.brandEmerald)),
            ],
          ),
          const SizedBox(height: 20),

          Text('Recent Registrations in Database', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 10),
          if (_users.isEmpty)
            const Text('No users in database.', style: TextStyle(color: Colors.white38, fontSize: 12))
          else
            ..._users.take(6).map((u) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppTheme.surfaceDarker,
                    child: Text(
                      (u['full_name'] ?? u['email'] ?? 'U')[0].toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(u['full_name'] ?? u['email'] ?? 'User', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                        Text(u['email'] ?? '', style: const TextStyle(fontSize: 10, color: Colors.white54)),
                      ],
                    ),
                  ),
                  Chip(
                    label: Text((u['role_name'] ?? 'User').toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.brandCyan)),
                    backgroundColor: AppTheme.surfaceDarker,
                  ),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
          Text(label, style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.6))),
        ],
      ),
    );
  }

  Widget _buildUsersTab() {
    return _users.isEmpty
        ? const Center(child: Text('No users found in database.', style: TextStyle(color: Colors.white38)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _users.length,
            itemBuilder: (context, index) {
              final u = _users[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.brandRose.withValues(alpha: 0.2),
                    child: const Icon(Icons.person, color: AppTheme.brandRose),
                  ),
                  title: Text(u['full_name'] ?? u['email'] ?? 'User', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text('${u['email']} • Role: ${u['role_name'] ?? "User"}', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                  trailing: const Icon(Icons.more_vert, color: Colors.white38),
                ),
              );
            },
          );
  }
}
