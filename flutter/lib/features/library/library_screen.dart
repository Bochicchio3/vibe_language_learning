import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'library_repository.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(libraryStoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Library'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/generator'),
          ),
        ],
      ),
      body: storiesAsync.when(
        data: (stories) {
          if (stories.isEmpty) {
            return const Center(
              child: Text('No stories yet. Generate one!'),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: stories.length,
            itemBuilder: (context, index) {
              final story = stories[index];
              return Card(
                clipBehavior: Clip.antiAlias,
                child: ListTile(
                  title: Text(story.title),
                  subtitle: Text('${story.level} • ${story.topic}'),
                  trailing: story.isRead
                      ? const Icon(Icons.check_circle, color: Colors.green)
                      : const Icon(Icons.circle_outlined),
                  onTap: () => context.push('/read/${story.id}'),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
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
}
