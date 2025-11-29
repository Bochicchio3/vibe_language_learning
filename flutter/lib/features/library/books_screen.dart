import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'books_repository.dart';
import 'widgets/book_card.dart';

class BooksScreen extends ConsumerStatefulWidget {
  const BooksScreen({super.key});

  @override
  ConsumerState<BooksScreen> createState() => _BooksScreenState();
}

class _BooksScreenState extends ConsumerState<BooksScreen> {
  bool _isPublicTab = false;
  String _searchQuery = '';
  final List<String> _selectedLevels = [];

  @override
  Widget build(BuildContext context) {
    final booksAsync = ref.watch(booksListProvider(_isPublicTab));

    return Scaffold(
      body: Scrollbar(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              title: const Text('Books Library'),
              floating: true,
              actions: [
                IconButton(
                  icon: const Icon(Icons.upload_file),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Import feature coming soon')),
                    );
                  },
                  tooltip: 'Import Book',
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(110),
                child: Column(
                  children: [
                    // Tabs
                    Row(
                      children: [
                        Expanded(
                          child: _TabButton(
                            label: 'My Library',
                            icon: Icons.person,
                            isSelected: !_isPublicTab,
                            onTap: () => setState(() => _isPublicTab = false),
                          ),
                        ),
                        Expanded(
                          child: _TabButton(
                            label: 'Public Library',
                            icon: Icons.public,
                            isSelected: _isPublicTab,
                            onTap: () => setState(() => _isPublicTab = true),
                          ),
                        ),
                      ],
                    ),
                    // Search & Filter
                    Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: SearchBar(
                              hintText: 'Search books...',
                              leading: const Icon(Icons.search),
                              elevation: WidgetStateProperty.all(0),
                              backgroundColor: WidgetStateProperty.all(
                                Theme.of(context)
                                    .colorScheme
                                    .surfaceContainerHighest
                                    .withOpacity(0.5),
                              ),
                              onChanged: (value) =>
                                  setState(() => _searchQuery = value),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: Icon(
                              Icons.filter_list,
                              color: _selectedLevels.isNotEmpty
                                  ? Theme.of(context).colorScheme.primary
                                  : null,
                            ),
                            onPressed: _showFilterDialog,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            booksAsync.when(
              data: (books) {
                final filteredBooks = books.where((book) {
                  final matchesSearch = book.title
                      .toLowerCase()
                      .contains(_searchQuery.toLowerCase());
                  final matchesLevel = _selectedLevels.isEmpty ||
                      _selectedLevels.contains(book.level);
                  return matchesSearch && matchesLevel;
                }).toList();

                if (filteredBooks.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.menu_book, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text('No books found'),
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
                      maxCrossAxisExtent: 200,
                      childAspectRatio: 0.65,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final book = filteredBooks[index];
                        return BookCard(
                          book: book,
                          isPublic: _isPublicTab,
                          onTap: () => _onBookTap(book),
                          primaryActionLabel:
                              _isPublicTab ? 'Add to Library' : 'Start Reading',
                          primaryActionIcon: _isPublicTab
                              ? Icons.download
                              : Icons.play_circle_outline,
                          onPrimaryAction: () => _onBookAction(book),
                        );
                      },
                      childCount: filteredBooks.length,
                    ),
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (err, stack) => SliverFillRemaining(
                child: Center(child: Text('Error: $err')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Filter by Level'),
          content: Wrap(
            spacing: 8,
            children: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) {
              final isSelected = _selectedLevels.contains(level);
              return FilterChip(
                label: Text(level),
                selected: isSelected,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedLevels.add(level);
                    } else {
                      _selectedLevels.remove(level);
                    }
                  });
                  // Update parent state as well to trigger rebuild
                  this.setState(() {});
                },
              );
            }).toList(),
          ),
          actions: [
            TextButton(
              onPressed: () {
                setState(() => _selectedLevels.clear());
                this.setState(() {});
              },
              child: const Text('Clear'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }

  void _onBookTap(Book book) {
    if (_isPublicTab) {
      // Show preview or details dialog?
      // For now just action
      _onBookAction(book);
    } else {
      context.push('/books/${book.id}');
    }
  }

  void _onBookAction(Book book) {
    if (_isPublicTab) {
      // TODO: Implement Add to Library
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add to Library not implemented yet')),
      );
    } else {
      context.push('/book/${book.id}/read/${book.currentChapter}');
    }
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.onSurfaceVariant;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? color : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
