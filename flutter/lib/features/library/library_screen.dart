import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'library_repository.dart';
import '../vocabulary/vocabulary_repository.dart';
import 'widgets/story_card.dart';
import 'utils/library_utils.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  String _searchQuery = '';
  final List<String> _selectedLevels = [];
  final List<String> _selectedStatuses = [];
  String _activeTab = 'private'; // 'private' | 'public'

  void _toggleLevel(String level) {
    setState(() {
      if (level == 'All') {
        _selectedLevels.clear();
      } else if (_selectedLevels.contains(level)) {
        _selectedLevels.remove(level);
      } else {
        _selectedLevels.add(level);
      }
    });
  }

  void _toggleStatus(String status) {
    setState(() {
      if (status == 'All') {
        _selectedStatuses.clear();
      } else if (_selectedStatuses.contains(status)) {
        _selectedStatuses.remove(status);
      } else {
        _selectedStatuses.add(status);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isPublic = _activeTab == 'public';
    final storiesAsync = ref.watch(libraryStoriesProvider(isPublic));
    final vocabAsync = ref.watch(vocabularyListProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
      body: CustomScrollView(
        slivers: [
          // Header & Filters
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  // Top Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your Library',
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF0F172A),
                                ),
                          ),
                          Text(
                            'Manage and read your German texts',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: isDark
                                      ? Colors.grey.shade400
                                      : Colors.grey.shade600,
                                ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              // TODO: Implement Daily News
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text('Daily News coming soon')),
                              );
                            },
                            icon: const Icon(Icons.public, size: 18),
                            label: const Text('Daily News'),
                          ),
                          const SizedBox(width: 8),
                          FilledButton.icon(
                            onPressed: () => context.push('/generator'),
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Add Text'),
                            style: FilledButton.styleFrom(
                              backgroundColor:
                                  const Color(0xFF4F46E5), // Indigo
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Tabs
                  Row(
                    children: [
                      _buildTab('My Library', 'private'),
                      const SizedBox(width: 24),
                      _buildTab('Public Library', 'public'),
                    ],
                  ),
                  const Divider(height: 1),
                  const SizedBox(height: 24),

                  // Search Bar
                  TextField(
                    onChanged: (value) => setState(() => _searchQuery = value),
                    decoration: InputDecoration(
                      hintText: 'Search titles or content...',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: isDark
                          ? const Color(0xFF1E293B)
                          : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Filters
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        Text('Level:',
                            style: TextStyle(
                                color: Colors.grey.shade500,
                                fontWeight: FontWeight.w500)),
                        const SizedBox(width: 8),
                        _buildFilterChip('All', _selectedLevels.isEmpty,
                            () => _toggleLevel('All')),
                        ...['A1', 'A2', 'B1', 'B2', 'C1'].map((level) =>
                            _buildFilterChip(
                                level,
                                _selectedLevels.contains(level),
                                () => _toggleLevel(level))),
                        const SizedBox(width: 16),
                        Container(
                            width: 1, height: 24, color: Colors.grey.shade300),
                        const SizedBox(width: 16),
                        Text('Status:',
                            style: TextStyle(
                                color: Colors.grey.shade500,
                                fontWeight: FontWeight.w500)),
                        const SizedBox(width: 8),
                        _buildFilterChip('All', _selectedStatuses.isEmpty,
                            () => _toggleStatus('All')),
                        ...['Unread', 'In Progress', 'Completed'].map(
                            (status) => _buildFilterChip(
                                status,
                                _selectedStatuses.contains(status),
                                () => _toggleStatus(status))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content Grid
          if (storiesAsync.isLoading || vocabAsync.isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (storiesAsync.hasError || vocabAsync.hasError)
            SliverFillRemaining(
              child: Center(
                  child: Text(
                      'Error loading data: ${storiesAsync.error ?? vocabAsync.error}')),
            )
          else
            Builder(
              builder: (context) {
                final stories = storiesAsync.value ?? [];
                final vocab = vocabAsync.value ?? [];

                // Filter Logic
                final filteredStories = stories.where((story) {
                  // Search
                  if (_searchQuery.isNotEmpty) {
                    final query = _searchQuery.toLowerCase();
                    if (!story.title.toLowerCase().contains(query) &&
                        !story.content.toLowerCase().contains(query)) {
                      return false;
                    }
                  }

                  // Level
                  if (_selectedLevels.isNotEmpty &&
                      !_selectedLevels.contains(story.level)) {
                    return false;
                  }

                  // Status
                  if (_selectedStatuses.isNotEmpty) {
                    final stats = calculateStoryStats(story, vocab);
                    final isUnread = !story.isRead && stats.unknownCount == 0;
                    final isCompleted = story.isRead;
                    final isInProgress =
                        stats.unknownCount > 0 && !story.isRead;

                    bool matches = false;
                    if (_selectedStatuses.contains('Unread') && isUnread)
                      matches = true;
                    if (_selectedStatuses.contains('Completed') && isCompleted)
                      matches = true;
                    if (_selectedStatuses.contains('In Progress') &&
                        isInProgress) matches = true;

                    if (!matches) return false;
                  } else {
                    // Default behavior: Hide completed unless specifically filtered?
                    // React logic: "Hide completed stories by default UNLESS Completed status filter is selected"
                    if (story.isRead &&
                        !_selectedStatuses.contains('Completed')) {
                      return false;
                    }
                  }

                  return true;
                }).toList();

                if (filteredStories.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 48, color: Colors.grey),
                          SizedBox(height: 16),
                          Text('No stories found matching your filters'),
                        ],
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 400,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 0.85, // Adjust based on card content
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final story = filteredStories[index];
                        final stats = calculateStoryStats(story, vocab);

                        return StoryCard(
                          story: story,
                          stats: stats,
                          onToggleRead: () {
                            // TODO: Implement toggle read in repository
                            // For now just log
                            print('Toggle read for ${story.id}');
                          },
                          onDelete: () {
                            // TODO: Implement delete in repository
                            print('Delete ${story.id}');
                          },
                        );
                      },
                      childCount: filteredStories.length,
                    ),
                  ),
                );
              },
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/library');
              break;
            case 1:
              context.go('/books');
              break;
            case 2:
              context.go('/vocab');
              break;
            case 3:
              context.go('/chat');
              break;
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.library_books),
            label: 'Library',
          ),
          NavigationDestination(
            icon: Icon(Icons.book),
            label: 'Books',
          ),
          NavigationDestination(
            icon: Icon(Icons.style),
            label: 'Vocab',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat),
            label: 'Chat',
          ),
        ],
      ),
    );
  }

  Widget _buildTab(String label, String id) {
    final isActive = _activeTab == id;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () => setState(() => _activeTab = id),
      child: Container(
        padding: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isActive ? const Color(0xFF4F46E5) : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: isActive
                ? (isDark ? const Color(0xFF818CF8) : const Color(0xFF4F46E5))
                : Colors.grey,
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? Colors.white : const Color(0xFF1E293B))
                : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected
                  ? Colors.transparent
                  : (isDark
                      ? const Color(0xFF334155)
                      : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isSelected
                  ? (isDark ? const Color(0xFF0F172A) : Colors.white)
                  : (isDark ? Colors.grey.shade300 : const Color(0xFF475569)),
            ),
          ),
        ),
      ),
    );
  }
}
