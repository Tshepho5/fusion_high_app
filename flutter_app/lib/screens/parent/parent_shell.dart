import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../common/calendar_screen.dart';
import '../common/messages_screen.dart';

class ParentShell extends StatefulWidget {
  const ParentShell({super.key});

  @override
  State<ParentShell> createState() => _ParentShellState();
}

class _ParentShellState extends State<ParentShell> {
  int _currentIndex = 0;
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  List<dynamic> _children = [];

  @override
  void initState() {
    super.initState();
    _loadParentData();
  }

  Future<void> _loadParentData() async {
    try {
      final ch = await _apiService.getParentChildren();
      if (mounted) {
        setState(() {
          _children = ch;
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
      _buildChildrenTab(),
      const MessagesScreen(),
      const CalendarScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Parent & Family Portal', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${user?.displayName ?? "Guardian"} • Linked Family', style: const TextStyle(fontSize: 10, color: AppTheme.brandAmber)),
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
        indicatorColor: AppTheme.brandAmber.withValues(alpha: 0.3),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.family_restroom_outlined), selectedIcon: Icon(Icons.family_restroom, color: AppTheme.brandAmber), label: 'Family Hub'),
          NavigationDestination(icon: Icon(Icons.school_outlined), selectedIcon: Icon(Icons.school, color: AppTheme.brandAmber), label: 'Linked Children'),
          NavigationDestination(icon: Icon(Icons.chat_outlined), selectedIcon: Icon(Icons.chat, color: AppTheme.brandEmerald), label: 'Teacher Chat'),
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
              gradient: const LinearGradient(colors: [AppTheme.brandAmber, AppTheme.brandRose]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome, ${user?.fullName ?? "Parent"}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 4),
                const Text('Parent Portal • Live academic monitoring & official reports', style: TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text('Linked Students', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 10),
          if (_children.isEmpty)
            const Text('No linked children found in database.', style: TextStyle(color: Colors.white38, fontSize: 12))
          else
            ..._children.map((c) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.brandAmber.withValues(alpha: 0.2),
                    child: const Icon(Icons.person, color: AppTheme.brandAmber),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c['full_name'] ?? c['name'] ?? 'Learner', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                        Text('Grade ${c['grade'] ?? "11"} • No: ${c['learner_number'] ?? "N/A"}', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                      ],
                    ),
                  ),
                  const Chip(
                    label: Text('ACTIVE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.brandEmerald)),
                    backgroundColor: AppTheme.surfaceDarker,
                  ),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildChildrenTab() {
    return _children.isEmpty
        ? const Center(child: Text('No linked student profiles found in database.', style: TextStyle(color: Colors.white38)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _children.length,
            itemBuilder: (context, index) {
              final c = _children[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: const CircleAvatar(backgroundColor: AppTheme.surfaceDarker, child: Icon(Icons.school, color: AppTheme.brandAmber, size: 18)),
                  title: Text(c['full_name'] ?? c['name'] ?? 'Learner', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text('Grade ${c['grade'] ?? "11"} • Term 1 Average: 74% (Level 6)', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                  trailing: const Icon(Icons.assessment, color: AppTheme.brandAmber),
                ),
              );
            },
          );
  }
}
