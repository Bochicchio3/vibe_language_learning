import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'reader_repository.dart';
import '../../services/tts_service.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  final String storyId;

  const ReaderScreen({super.key, required this.storyId});

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  bool _isPlaying = false;

  @override
  Widget build(BuildContext context) {
    final storyAsync = ref.watch(storyDetailsProvider(widget.storyId));
    final ttsService = ref.watch(ttsServiceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reader'),
        actions: [
          IconButton(
            icon: Icon(_isPlaying ? Icons.stop : Icons.volume_up),
            onPressed: () async {
              final story = storyAsync.value;
              if (story == null) return;

              if (_isPlaying) {
                await ttsService.stop();
                setState(() => _isPlaying = false);
              } else {
                setState(() => _isPlaying = true);
                // Map simplified language codes (e.g., 'German' -> 'de-DE')
                // Ideally this mapping should be in a utility
                String langCode = 'en-US';
                if (story.level.isNotEmpty) {
                   // Placeholder logic for language detection/mapping
                   // In real app, story.targetLanguage should be used
                }
                
                await ttsService.speak(story.content, langCode);
                // Note: flutter_tts completion handler doesn't easily update state here 
                // without more complex stream setup, simplifying for now.
              }
            },
          ),
        ],
      ),
      body: storyAsync.when(
        data: (story) {
          if (story == null) return const Center(child: Text('Story not found'));
          
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  story.title,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  '${story.level} • ${story.topic}',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Theme.of(context).colorScheme.secondary,
                      ),
                ),
                const Divider(height: 32),
                MarkdownBody(
                  data: story.content,
                  styleSheet: MarkdownStyleSheet(
                    p: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          height: 1.6,
                          fontSize: 18,
                        ),
                  ),
                  selectable: true,
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Show AI tools (Simplify, Explain)
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('AI Tools coming soon')),
          );
        },
        child: const Icon(Icons.auto_awesome),
      ),
    );
  }
}
