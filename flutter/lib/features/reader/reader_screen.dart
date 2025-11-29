import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'reader_repository.dart';
import '../../shared/widgets/smart_text_reader.dart';

class ReaderScreen extends ConsumerWidget {
  final String storyId;

  const ReaderScreen({super.key, required this.storyId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storyAsync = ref.watch(storyDetailsProvider(storyId));

    return storyAsync.when(
      data: (story) {
        if (story == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Reader')),
            body: const Center(child: Text('Story not found')),
          );
        }

        return SmartTextReader(
          content: story.content,
          title: story.title,
          subtitle: '${story.level} • ${story.topic}',
          language: story.language,
        );
      },
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Reader')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (err, stack) => Scaffold(
        appBar: AppBar(title: const Text('Reader')),
        body: Center(child: Text('Error: $err')),
      ),
    );
  }
}
