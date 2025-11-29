import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'books_repository.dart';
import '../../shared/widgets/smart_text_reader.dart';

class ChapterReaderScreen extends ConsumerWidget {
  final String bookId;
  final int chapterIndex;

  const ChapterReaderScreen({
    super.key,
    required this.bookId,
    required this.chapterIndex,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookAsync = ref.watch(bookDetailsProvider(bookId));

    return bookAsync.when(
      data: (book) {
        if (book == null)
          return const Scaffold(body: Center(child: Text('Book not found')));

        if (chapterIndex < 0 || chapterIndex >= book.chapters.length) {
          return const Scaffold(body: Center(child: Text('Chapter not found')));
        }

        final chapter = book.chapters[chapterIndex];
        final isLastChapter = chapterIndex == book.chapters.length - 1;
        final isFirstChapter = chapterIndex == 0;

        return SmartTextReader(
          content: chapter.content,
          title: chapter.title,
          subtitle: '${book.title} • Chapter ${chapterIndex + 1}',
          // language: book.language, // TODO: Add language to Book model
          onNext: isLastChapter
              ? null
              : () {
                  context.pushReplacement(
                      '/book/$bookId/read/${chapterIndex + 1}');
                },
          onPrevious: isFirstChapter
              ? null
              : () {
                  context.pushReplacement(
                      '/book/$bookId/read/${chapterIndex - 1}');
                },
        );
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, stack) => Scaffold(body: Center(child: Text('Error: $err'))),
    );
  }
}
