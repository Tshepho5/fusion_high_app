import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final ApiService _apiService = ApiService();
  List<EventModel> _events = [];
  bool _isLoading = true;
  String _selectedCategory = 'all';

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    try {
      final list = await _apiService.getEvents();
      if (mounted) {
        setState(() {
          _events = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Color _getEventColor(String type) {
    switch (type.toLowerCase()) {
      case 'exam':
      case 'exams':
        return AppTheme.brandRose;
      case 'academic':
        return AppTheme.brandPrimary;
      case 'sports':
        return AppTheme.brandCyan;
      case 'holiday':
        return AppTheme.brandAmber;
      case 'meeting':
      default:
        return AppTheme.brandEmerald;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final filtered = _selectedCategory == 'all'
        ? _events
        : _events.where((e) => e.eventType == _selectedCategory).toList();

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_month, color: AppTheme.brandCyan, size: 24),
              const SizedBox(width: 8),
              Text(
                'School Calendar & Events',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Category filter pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('all', 'All Events'),
                _buildFilterChip('exam', 'Exams & Tests'),
                _buildFilterChip('academic', 'Academic'),
                _buildFilterChip('sports', 'Sports & Culture'),
                _buildFilterChip('holiday', 'Holidays'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text('No events scheduled in database.', style: TextStyle(color: Colors.white38, fontSize: 13)),
                  )
                : ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final ev = filtered[index];
                      final color = _getEventColor(ev.eventType);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: color.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: color.withValues(alpha: 0.4)),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    ev.eventDate.isNotEmpty ? ev.eventDate.split('-').last : '01',
                                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: color),
                                  ),
                                  Text(
                                    ev.eventType.toUpperCase(),
                                    style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: color, fontFamily: 'monospace'),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    ev.title,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                                  ),
                                  if (ev.description != null && ev.description!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        ev.description!,
                                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
                                      ),
                                    ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      if (ev.startTime != null) ...[
                                        const Icon(Icons.access_time, size: 12, color: Colors.white38),
                                        const SizedBox(width: 4),
                                        Text('${ev.startTime} ${ev.endTime != null ? "- ${ev.endTime}" : ""}', style: const TextStyle(fontSize: 10, color: Colors.white54)),
                                        const SizedBox(width: 12),
                                      ],
                                      if (ev.location != null) ...[
                                        const Icon(Icons.location_on, size: 12, color: Colors.white38),
                                        const SizedBox(width: 4),
                                        Text(ev.location!, style: const TextStyle(fontSize: 10, color: Colors.white54)),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String id, String label) {
    final isSelected = _selectedCategory == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? Colors.white : Colors.white60)),
        selected: isSelected,
        selectedColor: AppTheme.brandPrimary,
        backgroundColor: AppTheme.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onSelected: (_) => setState(() => _selectedCategory = id),
      ),
    );
  }
}
