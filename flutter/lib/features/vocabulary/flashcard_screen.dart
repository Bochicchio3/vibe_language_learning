import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'vocabulary_repository.dart';

class FlashcardScreen extends ConsumerStatefulWidget {
  const FlashcardScreen({super.key});

  @override
  ConsumerState<FlashcardScreen> createState() => _FlashcardScreenState();
}

class _FlashcardScreenState extends ConsumerState<FlashcardScreen> {
  bool _showDefinition = false;
  int _currentIndex = 0;

  void _nextCard() {
    setState(() {
      _showDefinition = false;
      _currentIndex++;
    });
  }

  @override
  Widget build(BuildContext context) {
    final vocabAsync = ref.watch(vocabularyListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Flashcards')),
      body: vocabAsync.when(
        data: (words) {
          if (words.isEmpty) {
            return const Center(child: Text('No words to review.'));
          }

          if (_currentIndex >= words.length) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle_outline,
                      size: 64, color: Colors.green),
                  const SizedBox(height: 16),
                  const Text('Session Complete!',
                      style: TextStyle(fontSize: 24)),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Back to Dashboard'),
                  ),
                ],
              ),
            );
          }

          final word = words[_currentIndex];

          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                LinearProgressIndicator(
                  value: (_currentIndex + 1) / words.length,
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: Center(
                    child: TweenAnimationBuilder(
                      tween:
                          Tween<double>(begin: 0, end: _showDefinition ? 1 : 0),
                      duration: const Duration(milliseconds: 600),
                      builder: (context, double val, child) {
                        final isFront = val < 0.5;
                        final angle = val * pi;
                        final transform = Matrix4.identity()
                          ..setEntry(3, 2, 0.001)
                          ..rotateY(angle);

                        return Transform(
                          transform: transform,
                          alignment: Alignment.center,
                          child: isFront
                              ? _buildFront(word)
                              : Transform(
                                  transform: Matrix4.identity()..rotateY(pi),
                                  alignment: Alignment.center,
                                  child: _buildBack(word),
                                ),
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                if (_showDefinition)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildRatingButton('Hard', Colors.red, _nextCard),
                      _buildRatingButton('Good', Colors.blue, _nextCard),
                      _buildRatingButton('Easy', Colors.green, _nextCard),
                    ],
                  )
                else
                  FilledButton(
                    onPressed: () => setState(() => _showDefinition = true),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Show Answer'),
                  ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildFront(VocabWord word) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: double.infinity,
        height: 400,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(32),
        child: Text(
          word.word,
          style: Theme.of(context).textTheme.displayMedium,
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  Widget _buildBack(VocabWord word) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Container(
        width: double.infinity,
        height: 400,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              word.definition,
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Text(
              word.context,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: Theme.of(context).colorScheme.secondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatingButton(String label, Color color, VoidCallback onPressed) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0),
        child: FilledButton(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: color,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
          child: Text(label),
        ),
      ),
    );
  }
}
