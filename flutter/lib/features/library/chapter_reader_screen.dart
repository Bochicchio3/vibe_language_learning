import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:go_router/go_router.dart';
import 'books_repository.dart';
import '../../services/tts_service.dart';

class ChapterReaderScreen extends ConsumerStatefulWidget {
  final String bookId;
  final int chapterIndex;

  const ChapterReaderScreen({
    super.key,
    required this.bookId,
    required this.chapterIndex,
  });

  @override
  ConsumerState<ChapterReaderScreen> createState() => _ChapterReaderScreenState();
}

class _ChapterReaderScreenState extends ConsumerState<ChapterReaderScreen> {
  bool _isPlaying = false;

  @override
  Widget build(BuildContext context) {
    final bookAsync = ref.watch(bookDetailsProvider(widget.bookId));
    final ttsService = ref.watch(ttsServiceProvider);

    return bookAsync.when(
      data: (book) {
        if (book == null) return const Scaffold(body: Center(child: Text('Book not found')));
        
        if (widget.chapterIndex < 0 || widget.chapterIndex >= book.chapters.length) {
          return const Scaffold(body: Center(child: Text('Chapter not found')));
        }

        final chapter = book.chapters[widget.chapterIndex];
        final isLastChapter = widget.chapterIndex == book.chapters.length - 1;
        final isFirstChapter = widget.chapterIndex == 0;

        return Scaffold(
          appBar: AppBar(
            title: Text(chapter.title),
            actions: [
              IconButton(
                icon: Icon(_isPlaying ? Icons.stop : Icons.volume_up),
                onPressed: () async {
                  if (_isPlaying) {
                    await ttsService.stop();
                    setState(() => _isPlaying = false);
                  } else {
                    setState(() => _isPlaying = true);
                    // TODO: Detect language from book metadata
                    await ttsService.speak(chapter.content, 'en-US');
                  }
                },
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MarkdownBody(
                  data: chapter.content,
                  styleSheet: MarkdownStyleSheet(
                    p: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          height: 1.6,
                          fontSize: 18,
                        ),
                  ),
                  selectable: true,
                ),
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (!isFirstChapter)
                      FilledButton.tonal(
                        onPressed: () {
                          context.pushReplacement('/book/${widget.bookId}/read/${widget.chapterIndex - 1}');
                        },
                        child: const Text('Previous'),
                      )
                    else
                      const SizedBox.shrink(),
                    if (!isLastChapter)
                      FilledButton(
                        onPressed: () {
                          context.pushReplacement('/book/${widget.bookId}/read/${widget.chapterIndex + 1}');
                        },
                        child: const Text('Next'),
                      )
                    else
                      FilledButton(
                        onPressed: () {
                          context.pop(); // Go back to details
                        },
                        child: const Text('Finish'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, stack) => Scaffold(body: Center(child: Text('Error: $err'))),
    );
  }
}
