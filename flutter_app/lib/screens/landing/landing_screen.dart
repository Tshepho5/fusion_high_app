import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  int _selectedRoleIndex = 0;

  final List<Map<String, dynamic>> _roleShowcases = [
    {
      'role': 'Learner',
      'title': 'Learner & Student Portal',
      'badge': 'PRO STUDENT PORTAL',
      'icon': Icons.school,
      'color': AppTheme.brandPrimary,
      'description': 'Personalized AI Study Tutor, full CAPS curriculum textbook viewer, real-time timetable, and interactive revision quizzes.',
      'highlights': [
        'Smart AI Study Tutor with step-by-step CAPS problem solver',
        'Grade 8-12 Science, Commerce & Tourism streaming curriculum',
        'Live period-by-period class timetable with venue navigation',
      ],
      'stat': '48 CAPS Topics',
    },
    {
      'role': 'Teacher',
      'title': 'Educator & Faculty Workspace',
      'badge': 'SMART TEACHER SUITE',
      'icon': Icons.work,
      'color': AppTheme.brandCyan,
      'description': 'Automate lesson plan preparation, generate CAPS test papers with marking memoranda, and coordinate period swaps.',
      'highlights': [
        'One-click AI Lesson Plan generator aligned to CAPS terms',
        'Automatic Test Paper & Question Builder with full solutions',
        'Teacher-to-Teacher timetable period exchange workflow',
      ],
      'stat': '75% Prep Saved',
    },
    {
      'role': 'Parent',
      'title': 'Parent & Guardian Hub',
      'badge': 'FAMILY ENGAGEMENT',
      'icon': Icons.family_restroom,
      'color': AppTheme.brandAmber,
      'description': 'Track multi-child academic progress, monitor real-time daily presence, and print official CAPS report cards.',
      'highlights': [
        'Seamless multi-child registration and academic record linking',
        'Live daily attendance logs, arrival punctuality, and alerts',
        'Direct WhatsApp messaging line with subject educators',
      ],
      'stat': 'CAPS Certified',
    },
    {
      'role': 'Admin',
      'title': 'Institutional Administration',
      'badge': 'EXECUTIVE INTELLIGENCE',
      'icon': Icons.admin_panel_settings,
      'color': AppTheme.brandRose,
      'description': 'AI-assisted Master Timetable Generator, user directory management, and school-wide broadcast studio.',
      'highlights': [
        'AI Timetable Allocator with automatic teacher workload balancing',
        'Publish schedules for teacher review before learner release',
        'Comprehensive user directory with role-based permissions',
      ],
      'stat': '1,250+ Enrolled',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final currentRole = _roleShowcases[_selectedRoleIndex];

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // AppBar
          SliverAppBar(
            floating: true,
            pinned: true,
            backgroundColor: AppTheme.surfaceDarker.withValues(alpha: 0.9),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.brandPrimary, AppTheme.brandCyan],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Text(
                      'F',
                      style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'FUSION HIGH',
                      style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Text(
                      'SMS 2.1 APP',
                      style: TextStyle(fontSize: 9, color: AppTheme.brandCyan, fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              if (auth.isAuthenticated)
                TextButton.icon(
                  onPressed: () {
                    Navigator.pushReplacementNamed(context, '/dashboard/${auth.role}');
                  },
                  icon: const Icon(Icons.dashboard, size: 16, color: AppTheme.brandCyan),
                  label: const Text('Enter Portal', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                )
              else
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/login'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandPrimary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    child: const Text('Sign In', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
            ],
          ),

          // Hero Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  // Innovation Chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceDark,
                      border: Border.all(color: AppTheme.brandPrimary.withValues(alpha: 0.3)),
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(radius: 4, backgroundColor: AppTheme.brandEmerald),
                        SizedBox(width: 8),
                        Text(
                          'CAPS Aligned • Smart AI Powered',
                          style: TextStyle(color: AppTheme.brandCyan, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Headline
                  Text(
                    'The Modern Operating System for South African High Schools',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),

                  Text(
                    'Unifying learners, educators, parents, and school administrators with intelligent AI tutoring, automated CAPS lesson planning, and real-time academic workflows.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 24),

                  // Call to action button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pushNamed(context, '/login'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.brandPrimary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 8,
                      ),
                      icon: const Icon(Icons.rocket_launch, size: 18),
                      label: const Text('Launch School Portal', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Role Showcase Selector
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 10),
                  Text(
                    'Explore 4 Dedicated Portals',
                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),

                  // Role selector pills
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(_roleShowcases.length, (idx) {
                        final isSelected = _selectedRoleIndex == idx;
                        final r = _roleShowcases[idx];
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(r['role'], style: TextStyle(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.white60, fontSize: 12)),
                            selected: isSelected,
                            selectedColor: r['color'],
                            backgroundColor: AppTheme.surfaceDark,
                            avatar: Icon(r['icon'], size: 16, color: isSelected ? Colors.white : Colors.white60),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            onSelected: (_) => setState(() => _selectedRoleIndex = idx),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Showcase Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceDark,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: (currentRole['color'] as Color).withValues(alpha: 0.3)),
                      boxShadow: [
                        BoxShadow(
                          color: (currentRole['color'] as Color).withValues(alpha: 0.15),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: (currentRole['color'] as Color).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            currentRole['badge'],
                            style: TextStyle(color: currentRole['color'], fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          currentRole['title'],
                          style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          currentRole['description'],
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12, height: 1.4),
                        ),
                        const SizedBox(height: 16),
                        ...((currentRole['highlights'] as List<String>).map((h) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle, color: AppTheme.brandEmerald, size: 16),
                              const SizedBox(width: 8),
                              Expanded(child: Text(h, style: const TextStyle(fontSize: 11, color: Colors.white))),
                            ],
                          ),
                        ))),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => Navigator.pushNamed(context, '/login'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: currentRole['color'],
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text('Enter ${currentRole['role']} Workspace', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
