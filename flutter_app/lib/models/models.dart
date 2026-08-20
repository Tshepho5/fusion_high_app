import '../config/api_config.dart';

class UserModel {
  final dynamic id;
  final String email;
  final String role;
  final String? fullName;
  final String? surname;
  final String? profilePicturePath;
  final int? grade;
  final String? learnerNumber;

  UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
    this.surname,
    this.profilePicturePath,
    this.grade,
    this.learnerNumber,
  });

  String get displayName => (fullName != null && fullName!.isNotEmpty)
      ? '$fullName ${surname ?? ''}'.trim()
      : email;

  String? get fullProfilePictureUrl {
    if (profilePicturePath == null || profilePicturePath!.isEmpty) return null;
    if (profilePicturePath!.startsWith('http://') || profilePicturePath!.startsWith('https://')) {
      return profilePicturePath;
    }
    final clean = profilePicturePath!.startsWith('/') ? profilePicturePath! : '/$profilePicturePath';
    return '${ApiConfig.baseUrl.replaceAll('/api', '')}$clean';
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['user_id'] ?? '',
      email: json['email'] ?? '',
      role: (json['role'] ?? json['role_name'] ?? 'learner').toString().toLowerCase(),
      fullName: json['full_name'] ?? json['name'],
      surname: json['surname'],
      profilePicturePath: json['profile_picture_path'] ?? json['profile_picture'],
      grade: json['grade'] is int ? json['grade'] : int.tryParse(json['grade']?.toString() ?? ''),
      learnerNumber: json['learner_number']?.toString(),
    );
  }
}

class ContactModel {
  final dynamic id;
  final String email;
  final String fullName;
  final String? surname;
  final String roleName;
  final String? tagName;
  final String? profilePicturePath;
  final String? lastMessage;
  final DateTime? lastActivity;
  final int unreadCount;

  ContactModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.surname,
    required this.roleName,
    this.tagName,
    this.profilePicturePath,
    this.lastMessage,
    this.lastActivity,
    this.unreadCount = 0,
  });

  String get displayName => (fullName.isNotEmpty)
      ? '$fullName ${surname ?? ''}'.trim()
      : email;

  String? get fullProfilePictureUrl {
    if (profilePicturePath == null || profilePicturePath!.isEmpty) return null;
    if (profilePicturePath!.startsWith('http://') || profilePicturePath!.startsWith('https://')) {
      return profilePicturePath;
    }
    final clean = profilePicturePath!.startsWith('/') ? profilePicturePath! : '/$profilePicturePath';
    return '${ApiConfig.baseUrl.replaceAll('/api', '')}$clean';
  }

  factory ContactModel.fromJson(Map<String, dynamic> json) {
    return ContactModel(
      id: json['id'],
      email: json['email'] ?? '',
      fullName: json['full_name'] ?? json['name'] ?? '',
      surname: json['surname'],
      roleName: (json['role_name'] ?? json['role'] ?? 'user').toString().toLowerCase(),
      tagName: json['tag_name'],
      profilePicturePath: json['profile_picture_path'],
      lastMessage: json['last_message'],
      lastActivity: json['last_activity'] != null
          ? DateTime.tryParse(json['last_activity'].toString())
          : null,
      unreadCount: json['unread_count'] is int
          ? json['unread_count']
          : int.tryParse(json['unread_count']?.toString() ?? '0') ?? 0,
    );
  }
}

class MessageModel {
  final dynamic id;
  final dynamic senderId;
  final dynamic recipientId;
  final String body;
  final DateTime createdAt;
  final bool isMe;

  MessageModel({
    required this.id,
    required this.senderId,
    required this.recipientId,
    required this.body,
    required this.createdAt,
    required this.isMe,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json, dynamic myUserId) {
    final sender = json['sender_id'];
    return MessageModel(
      id: json['id'],
      senderId: sender,
      recipientId: json['recipient_id'],
      body: json['body'] ?? json['content'] ?? json['message'] ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isMe: sender.toString() == myUserId.toString() || json['is_me'] == true,
    );
  }
}

class EventModel {
  final dynamic id;
  final String title;
  final String? description;
  final String eventDate;
  final String? startTime;
  final String? endTime;
  final String? location;
  final String eventType;
  final String audience;
  final int? gradeTarget;

  EventModel({
    required this.id,
    required this.title,
    this.description,
    required this.eventDate,
    this.startTime,
    this.endTime,
    this.location,
    required this.eventType,
    required this.audience,
    this.gradeTarget,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'],
      title: json['title'] ?? 'School Event',
      description: json['description'],
      eventDate: json['event_date']?.toString().split('T')[0] ?? '',
      startTime: json['start_time'],
      endTime: json['end_time'],
      location: json['location'],
      eventType: (json['event_type'] ?? 'general').toString().toLowerCase(),
      audience: (json['audience'] ?? 'all').toString().toLowerCase(),
      gradeTarget: json['grade_target'],
    );
  }
}
