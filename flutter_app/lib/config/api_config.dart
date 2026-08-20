import 'package:flutter/foundation.dart';

class ApiConfig {
  // Automatically detects platform to connect to local Express+PostgreSQL backend
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:4000/api';
    }
    // Android emulator alias for host machine localhost is 10.0.2.2
    // Windows Desktop or iOS use localhost / network IP
    return defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:4000/api'
        : 'http://localhost:4000/api';
  }

  // Base URL for uploads and static avatars
  static String get uploadsUrl {
    if (kIsWeb) {
      return 'http://localhost:4000';
    }
    return defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:4000'
        : 'http://localhost:4000';
  }
}
