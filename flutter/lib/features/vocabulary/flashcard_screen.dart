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
                  const Text('Session Complete!'),
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
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _showDefinition = !_showDefinition),
                    child: Card(
                      elevation: 4,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _showDefinition ? word.definition : word.word,
                                style: Theme.of(context).textTheme.displaySmall,
                                textAlign: TextAlign.center,
                              ),
                              if (_showDefinition) ...[
                                const SizedBox(height: 16),
                                Text(
                                  word.context,
                                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                        fontStyle: FontStyle.italic,
                                        color: Theme.of(context).colorScheme.secondary,
                                      ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                              const SizedBox(height: 32),
                              Text(
                                _showDefinition ? 'Tap to flip back' : 'Tap to reveal definition',
                                style: Theme.of(context).textTheme.labelMedium,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                if (_showDefinition)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      FilledButton(
                        onPressed: () {
                          // TODO: Implement SRS logic (Hard)
                          setState(() {
                            _showDefinition = false;
                            _currentIndex++;
                          });
                        },
                        style: FilledButton.styleFrom(backgroundColor: Colors.red),
                        child: const Text('Hard'),
                      ),
                      FilledButton(
                        onPressed: () {
                          // TODO: Implement SRS logic (Good)
                          setState(() {
                            _showDefinition = false;
                            _currentIndex++;
                          });
                        },
                        style: FilledButton.styleFrom(backgroundColor: Colors.blue),
                        child: const Text('Good'),
                      ),
                      FilledButton(
                        onPressed: () {
                          // TODO: Implement SRS logic (Easy)
                          setState(() {
                            _showDefinition = false;
                            _currentIndex++;
                          });
                        },
                        style: FilledButton.styleFrom(backgroundColor: Colors.green),
                        child: const Text('Easy'),
                      ),
                    ],
                  )
                else
                  FilledButton(
                    onPressed: () => setState(() => _showDefinition = true),
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
}
