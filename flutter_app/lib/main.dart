import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_theme.dart';
import 'providers/auth_provider.dart';
import 'screens/admin/admin_shell.dart';
import 'screens/auth/login_screen.dart';
import 'screens/landing/landing_screen.dart';
import 'screens/learner/learner_shell.dart';
import 'screens/parent/parent_shell.dart';
import 'screens/teacher/teacher_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initAuth()),
      ],
      child: const FusionHighApp(),
    ),
  );
}

class FusionHighApp extends StatelessWidget {
  const FusionHighApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fusion High SMS 2.1',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const LandingScreen(),
        '/login': (context) => const LoginScreen(),
        '/dashboard/learner': (context) => const LearnerShell(),
        '/dashboard/teacher': (context) => const TeacherShell(),
        '/dashboard/parent': (context) => const ParentShell(),
        '/dashboard/admin': (context) => const AdminShell(),
      },
      onGenerateRoute: (settings) {
        if (settings.name != null && settings.name!.startsWith('/dashboard/')) {
          final role = settings.name!.replaceFirst('/dashboard/', '').toLowerCase();
          switch (role) {
            case 'teacher':
              return MaterialPageRoute(builder: (_) => const TeacherShell());
            case 'parent':
              return MaterialPageRoute(builder: (_) => const ParentShell());
            case 'admin':
              return MaterialPageRoute(builder: (_) => const AdminShell());
            case 'learner':
            default:
              return MaterialPageRoute(builder: (_) => const LearnerShell());
          }
        }
        return MaterialPageRoute(builder: (_) => const LandingScreen());
      },
    );
  }
}
