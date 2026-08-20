import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<ContactModel> _contacts = [];
  ContactModel? _selectedContact;
  List<MessageModel> _conversation = [];
  bool _isLoading = true;
  bool _isSending = false;
  String _activeCategory = 'recent'; // recent, teachers, learners, parents, admins
  Timer? _pollingTimer;

  final List<String> _quickTemplates = [
    'Good day, thank you for the update!',
    'Please let me know when you are available for a consultation.',
    'I have submitted the required assessment.',
    'Could you please clarify the homework instructions?',
  ];

  @override
  void initState() {
    super.initState();
    _loadContacts();
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_selectedContact != null && mounted) {
        _loadConversation(_selectedContact!.id, silent: true);
      }
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _searchController.dispose();
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadContacts() async {
    try {
      final list = await _apiService.getContacts();
      if (mounted) {
        setState(() {
          _contacts = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadConversation(dynamic contactId, {bool silent = false}) async {
    final myId = context.read<AuthProvider>().user?.id;
    try {
      final msgs = await _apiService.getConversation(contactId, myId);
      if (mounted) {
        setState(() => _conversation = msgs);
        if (!silent) {
          _scrollToBottom();
        }
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage([String? textOverride]) async {
    final text = (textOverride ?? _inputController.text).trim();
    if (text.isEmpty || _selectedContact == null || _isSending) return;

    setState(() => _isSending = true);
    _inputController.clear();

    try {
      await _apiService.sendMessage(_selectedContact!.id, text);
      final myId = context.read<AuthProvider>().user?.id;
      final updatedMsgs = await _apiService.getConversation(_selectedContact!.id, myId);
      if (mounted) {
        setState(() {
          _conversation = updatedMsgs;
          _isSending = false;
        });
        _scrollToBottom();
        _loadContacts();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message')),
        );
      }
    }
  }

  List<ContactModel> _getFilteredContacts() {
    List<ContactModel> base = [];
    switch (_activeCategory) {
      case 'recent':
        base = _contacts.where((c) => c.lastMessage != null && c.lastMessage!.isNotEmpty).toList();
        if (base.isEmpty) base = _contacts;
        break;
      case 'teachers':
        base = _contacts.where((c) => c.roleName == 'teacher').toList();
        break;
      case 'learners':
        base = _contacts.where((c) => c.roleName == 'learner').toList();
        break;
      case 'parents':
        base = _contacts.where((c) => c.roleName == 'parent').toList();
        break;
      case 'admins':
        base = _contacts.where((c) => c.roleName == 'admin').toList();
        break;
    }

    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return base;

    return base.where((c) =>
      c.displayName.toLowerCase().contains(q) ||
      c.email.toLowerCase().contains(q) ||
      (c.tagName != null && c.tagName!.toLowerCase().contains(q))
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // On smaller screens, toggle between list and chat
    if (_selectedContact != null && MediaQuery.of(context).size.width < 700) {
      return _buildChatView(isMobile: true);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 700) {
          // Split Pane Desktop/Tablet View
          return Row(
            children: [
              SizedBox(
                width: 320,
                child: _buildContactsSidebar(),
              ),
              const VerticalDivider(width: 1, color: Colors.white10),
              Expanded(
                child: _selectedContact != null
                    ? _buildChatView(isMobile: false)
                    : const Center(
                        child: Text(
                          'Select a contact to view conversation',
                          style: TextStyle(color: Colors.white38, fontSize: 13),
                        ),
                      ),
              ),
            ],
          );
        }

        // Mobile list view
        return _buildContactsSidebar();
      },
    );
  }

  Widget _buildContactsSidebar() {
    final filtered = _getFilteredContacts();
    final recentCount = _contacts.where((c) => c.lastMessage != null).length;
    final teacherCount = _contacts.where((c) => c.roleName == 'teacher').length;
    final learnerCount = _contacts.where((c) => c.roleName == 'learner').length;
    final parentCount = _contacts.where((c) => c.roleName == 'parent').length;
    final adminCount = _contacts.where((c) => c.roleName == 'admin').length;

    return Container(
      color: AppTheme.waSidebar,
      child: Column(
        children: [
          // Category Tabs Strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            color: AppTheme.surfaceDarker,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildCategoryChip('recent', 'Chats ($recentCount)', Icons.chat_bubble_outline),
                  _buildCategoryChip('teachers', 'Staff ($teacherCount)', Icons.work_outline),
                  _buildCategoryChip('learners', 'Learners ($learnerCount)', Icons.school_outlined),
                  _buildCategoryChip('parents', 'Parents ($parentCount)', Icons.family_restroom_outlined),
                  _buildCategoryChip('admins', 'Admin ($adminCount)', Icons.admin_panel_settings_outlined),
                ],
              ),
            ),
          ),

          // Search Box
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search contacts...',
                prefixIcon: const Icon(Icons.search, size: 16, color: Colors.white38),
                isDense: true,
                filled: true,
                fillColor: AppTheme.waDarkHeader,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),

          // Contacts List
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text('No contacts found in database', style: TextStyle(color: Colors.white38, fontSize: 12)),
                  )
                : ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final contact = filtered[index];
                      final isSelected = _selectedContact?.id == contact.id;

                      return ListTile(
                        selected: isSelected,
                        selectedTileColor: AppTheme.surfaceElevated,
                        leading: Stack(
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: AppTheme.brandPrimary.withValues(alpha: 0.3),
                              child: Text(
                                contact.displayName.isNotEmpty ? contact.displayName[0].toUpperCase() : 'U',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: AppTheme.brandEmerald,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: AppTheme.waSidebar, width: 1.5),
                                ),
                              ),
                            ),
                          ],
                        ),
                        title: Text(
                          contact.displayName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          contact.lastMessage ?? contact.tagName ?? contact.roleName.toUpperCase(),
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: contact.lastActivity != null
                            ? Text(
                                DateFormat('HH:mm').format(contact.lastActivity!),
                                style: const TextStyle(fontSize: 10, color: Colors.white38, fontFamily: 'monospace'),
                              )
                            : null,
                        onTap: () {
                          setState(() => _selectedContact = contact);
                          _loadConversation(contact.id);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String id, String label, IconData icon) {
    final isSelected = _activeCategory == id;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        avatar: Icon(icon, size: 14, color: isSelected ? Colors.white : Colors.white60),
        label: Text(label, style: TextStyle(fontSize: 10, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        selected: isSelected,
        selectedColor: AppTheme.brandEmerald,
        backgroundColor: AppTheme.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        onSelected: (_) => setState(() => _activeCategory = id),
      ),
    );
  }

  Widget _buildChatView({required bool isMobile}) {
    return Scaffold(
      backgroundColor: AppTheme.waBackground,
      appBar: AppBar(
        backgroundColor: AppTheme.waDarkHeader,
        leading: isMobile
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _selectedContact = null),
              )
            : null,
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.brandPrimary,
              child: Text(
                _selectedContact!.displayName.isNotEmpty ? _selectedContact!.displayName[0].toUpperCase() : 'U',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _selectedContact!.displayName,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _selectedContact!.tagName ?? _selectedContact!.roleName.toUpperCase(),
                    style: const TextStyle(fontSize: 10, color: AppTheme.brandEmerald),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Response Chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            color: AppTheme.surfaceDarker,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _quickTemplates.map((t) => Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ActionChip(
                    label: Text(t, style: const TextStyle(fontSize: 10, color: Colors.white70)),
                    backgroundColor: AppTheme.surfaceElevated,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    onPressed: () => _sendMessage(t),
                  ),
                )).toList(),
              ),
            ),
          ),

          // Message Stream
          Expanded(
            child: _conversation.isEmpty
                ? const Center(
                    child: Text('No messages yet. Send a greeting below.', style: TextStyle(color: Colors.white38, fontSize: 12)),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(12),
                    itemCount: _conversation.length,
                    itemBuilder: (context, index) {
                      final msg = _conversation[index];
                      final isMe = msg.isMe;

                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isMe ? AppTheme.waOutgoingBubble : AppTheme.waIncomingBubble,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                              bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                msg.body,
                                style: const TextStyle(fontSize: 13, color: Colors.white, height: 1.3),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    DateFormat('HH:mm').format(msg.createdAt),
                                    style: const TextStyle(fontSize: 9, color: Colors.white54, fontFamily: 'monospace'),
                                  ),
                                  if (isMe) ...[
                                    const SizedBox(width: 4),
                                    const Icon(Icons.done_all, size: 12, color: AppTheme.brandCyan),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Input Footer
          Container(
            padding: const EdgeInsets.all(8),
            color: AppTheme.waDarkHeader,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      isDense: true,
                      filled: true,
                      fillColor: AppTheme.surfaceElevated,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.brandEmerald,
                  radius: 20,
                  child: IconButton(
                    icon: _isSending
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.send, size: 16, color: Colors.white),
                    onPressed: _isSending ? null : () => _sendMessage(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
