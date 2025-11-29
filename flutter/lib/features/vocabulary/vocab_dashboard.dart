import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'vocabulary_repository.dart';

class VocabDashboard extends ConsumerWidget {
  const VocabDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vocabAsync = ref.watch(vocabularyListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Vocabulary'),
        actions: [
          IconButton(
            icon: const Icon(Icons.style),
            onPressed: () {
              context.push('/flashcards');
            },
            tooltip: 'Practice Flashcards',
          ),
        ],
      ),
      body: vocabAsync.when(
        data: (words) {
          if (words.isEmpty) {
            return const Center(
              child: Text('No words saved yet.'),
            );
          }
          
          final masteredCount = words.where((w) => w.isMastered).length;
          final dueCount = words.where((w) => w.nextReview.isBefore(DateTime.now())).length;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Total Words',
                        value: words.length.toString(),
                        icon: Icons.list,
                        color: Colors.blue,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        label: 'Due',
                        value: dueCount.toString(),
                        icon: Icons.notifications,
                        color: Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        label: 'Mastered',
                        value: masteredCount.toString(),
                        icon: Icons.check_circle,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: words.length,
                  itemBuilder: (context, index) {
                    final word = words[index];
                    return ListTile(
                      title: Text(word.word),
                      subtitle: Text(word.definition),
                      trailing: word.isMastered
                          ? const Icon(Icons.star, color: Colors.amber)
                          : null,
                    );
                  },
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 2,
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
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}
