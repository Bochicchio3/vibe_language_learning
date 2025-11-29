import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../library_repository.dart';
import '../utils/library_utils.dart';

class StoryCard extends StatelessWidget {
  final Story story;
  final StoryStats stats;
  final VoidCallback? onToggleRead;
  final VoidCallback? onDelete;

  const StoryCard({
    super.key,
    required this.story,
    required this.stats,
    this.onToggleRead,
    this.onDelete,
  });

  Color _getDifficultyColor(bool isDark) {
    if (story.isRead) {
      return isDark
          ? Colors.amber.shade900.withValues(alpha: 0.2)
          : Colors.amber.shade50;
    }
    if (stats.unknownCount > 0) {
      if (stats.unknownPercent < 5) {
        return isDark
            ? Colors.green.shade900.withValues(alpha: 0.2)
            : Colors.green.shade50;
      }
      if (stats.unknownPercent < 15) {
        return isDark
            ? Colors.yellow.shade900.withValues(alpha: 0.2)
            : Colors.yellow.shade50;
      }
      return isDark
          ? Colors.red.shade900.withValues(alpha: 0.2)
          : Colors.red.shade50;
    }
    return isDark
        ? const Color(0xFF1E293B)
        : Colors.white; // Default background
  }

  Color _getBorderColor(bool isDark) {
    if (story.isRead) {
      return isDark ? Colors.amber.shade700 : Colors.amber.shade400;
    }
    if (stats.unknownCount > 0) {
      if (stats.unknownPercent < 5) {
        return isDark ? Colors.green.shade700 : Colors.green.shade400;
      }
      if (stats.unknownPercent < 15) {
        return isDark ? Colors.yellow.shade700 : Colors.yellow.shade400;
      }
      return isDark ? Colors.red.shade700 : Colors.red.shade400;
    }
    return isDark
        ? const Color(0xFF334155)
        : const Color(0xFFE2E8F0); // slate-700 : slate-200
  }

  Widget _buildDifficultyBadge(bool isDark) {
    String label;
    Color color;
    Color bgColor;

    if (story.isRead) {
      label = 'MASTERED';
      color = Colors.amber.shade700;
      bgColor = Colors.amber.shade100;
    } else if (stats.unknownPercent < 5) {
      label = 'EASY';
      color = Colors.green.shade700;
      bgColor = Colors.green.shade100;
    } else if (stats.unknownPercent < 15) {
      label = 'MEDIUM';
      color = Colors.yellow.shade800;
      bgColor = Colors.yellow.shade100;
    } else {
      label = 'HARD';
      color = Colors.red.shade700;
      bgColor = Colors.red.shade100;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = _getBorderColor(isDark);
    final bgColor = _getDifficultyColor(isDark);

    return Card(
      elevation: 0,
      color: bgColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: borderColor, width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/read/${story.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF334155)
                              : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: isDark
                                ? const Color(0xFF475569)
                                : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Text(
                          story.level,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color:
                                isDark ? Colors.white : const Color(0xFF475569),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildDifficultyBadge(isDark),
                    ],
                  ),
                  Row(
                    children: [
                      if (onToggleRead != null)
                        IconButton(
                          icon: Icon(
                            story.isRead
                                ? Icons.check_circle
                                : Icons.circle_outlined,
                            size: 20,
                            color: story.isRead ? Colors.green : Colors.grey,
                          ),
                          onPressed: onToggleRead,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          tooltip:
                              story.isRead ? 'Mark as Unread' : 'Mark as Read',
                        ),
                      if (onDelete != null) ...[
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.delete_outline,
                              size: 20, color: Colors.grey),
                          onPressed: onDelete,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          tooltip: 'Delete',
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Title
              Text(
                story.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),

              // Content Preview
              Text(
                story.content,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  height: 1.5,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const Spacer(),
              const Divider(),
              const SizedBox(height: 8),

              // Stats Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.menu_book,
                          size: 14, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        '${stats.totalWords}',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade500),
                      ),
                      const SizedBox(width: 12),
                      Icon(Icons.access_time,
                          size: 14, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        '${stats.readingTimeMinutes}m',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.indigo.shade900.withValues(alpha: 0.3)
                          : Colors.indigo.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.bar_chart,
                            size: 12, color: Colors.indigo.shade400),
                        const SizedBox(width: 4),
                        Text(
                          '${stats.unknownCount} new (${stats.unknownPercent}%)',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isDark
                                ? Colors.indigo.shade300
                                : Colors.indigo.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
