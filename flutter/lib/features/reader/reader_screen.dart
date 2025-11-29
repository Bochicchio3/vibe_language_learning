import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/text_utils.dart';
import '../../services/ai_service.dart';
import 'reader_repository.dart';
import '../../services/tts_service.dart';
import '../vocabulary/vocabulary_repository.dart';
import 'widgets/interactive_text.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  final String storyId;

  const ReaderScreen({super.key, required this.storyId});

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  bool _isPlaying = false;
  int? _highlightedTokenIndex;
  List<String> _tokens = [];
  List<int> _tokenOffsets = [];

  // AI State
  List<String> _models = [];
  String? _selectedModel;
  bool _isSimplifying = false;
  String? _simplifiedContent;
  bool _showingSimplified = false;

  @override
  void initState() {
    super.initState();
    _fetchModels();
    final ttsService = ref.read(ttsServiceProvider);
    ttsService.progressStream.listen((startOffset) {
      if (startOffset == -1) {
        if (mounted) setState(() => _highlightedTokenIndex = null);
        return;
      }

      // Find token containing startOffset
      // This assumes _tokenOffsets matches _tokens
      int index = -1;
      for (int i = 0; i < _tokenOffsets.length; i++) {
        if (_tokenOffsets[i] <= startOffset) {
          index = i;
        } else {
          break;
        }
      }

      if (index != -1 && mounted) {
        setState(() => _highlightedTokenIndex = index);
      }
    });
  }

  Future<void> _fetchModels() async {
    final models = await ref.read(aiServiceProvider).fetchModels();
    if (mounted) {
      setState(() {
        _models = models;
        if (models.isNotEmpty) _selectedModel = models.first;
      });
    }
  }

  Future<void> _simplifyText(String content) async {
    if (_selectedModel == null) return;

    setState(() => _isSimplifying = true);
    try {
      final simplified = await ref
          .read(aiServiceProvider)
          .simplifyStory(content, 'A2', _selectedModel!);
      if (mounted) {
        setState(() {
          _simplifiedContent = simplified;
          _showingSimplified = true;
          // Recalculate tokens for simplified text
          _calculateTokenOffsets(simplified);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to simplify: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSimplifying = false);
    }
  }

  Future<void> _explainText(
      String text, String template, String contextStr) async {
    if (_selectedModel == null) return;

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final result = await ref
          .read(aiServiceProvider)
          .explainText(text, template, contextStr, _selectedModel!);

      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context); // Hide loading

        // Show result
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          builder: (c) => DraggableScrollableSheet(
            initialChildSize: 0.5,
            minChildSize: 0.3,
            maxChildSize: 0.9,
            expand: false,
            builder: (context, scrollController) {
              return SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${template[0].toUpperCase()}${template.substring(1)} Explanation',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    // Render JSON result nicely
                    Text(result.toString()), // Placeholder for nice rendering
                  ],
                ),
              );
            },
          ),
        );
      }
    } catch (e) {
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context); // Hide loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to explain: $e')),
        );
      }
    }
  }

  void _calculateTokenOffsets(String content) {
    _tokens = tokenize(content);
    _tokenOffsets = [];
    int currentOffset = 0;
    for (final token in _tokens) {
      _tokenOffsets.add(currentOffset);
      currentOffset += token.length;
    }
  }

  @override
  Widget build(BuildContext context) {
    final storyAsync = ref.watch(storyDetailsProvider(widget.storyId));
    final ttsService = ref.watch(ttsServiceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reader'),
        actions: [
          // Simplify Button
          if (_models.isNotEmpty)
            IconButton(
              icon: _isSimplifying
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(_showingSimplified ? Icons.undo : Icons.auto_fix_high),
              tooltip: _showingSimplified ? 'Show Original' : 'Simplify Text',
              onPressed: _isSimplifying
                  ? null
                  : () {
                      final story = storyAsync.value;
                      if (story == null) return;

                      if (_showingSimplified) {
                        setState(() {
                          _showingSimplified = false;
                          _calculateTokenOffsets(story.content);
                        });
                      } else {
                        if (_simplifiedContent != null) {
                          setState(() {
                            _showingSimplified = true;
                            _calculateTokenOffsets(_simplifiedContent!);
                          });
                        } else {
                          _simplifyText(story.content);
                        }
                      }
                    },
            ),
        ],
      ),
      body: storyAsync.when(
        data: (story) {
          if (story == null)
            return const Center(child: Text('Story not found'));

          if (_tokens.isEmpty) {
            _calculateTokenOffsets(story.content);
          }

          return Stack(
            children: [
              SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                    16, 16, 16, 100), // Padding for bottom bar
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
                    InteractiveText(
                      text: _showingSimplified && _simplifiedContent != null
                          ? _simplifiedContent!
                          : story.content,
                      highlightedTokenIndex: _highlightedTokenIndex,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            height: 1.8,
                            fontSize: 18,
                          ),
                      onWordTap: (word) async {
                        // Highlight immediately
                        // Find token index
                        int tokenIndex = -1;
                        for (int i = 0; i < _tokens.length; i++) {
                          if (_tokens[i] == word) {
                            tokenIndex = i;
                            break;
                          }
                        }
                        if (tokenIndex != -1) {
                          setState(() => _highlightedTokenIndex = tokenIndex);
                        }

                        // Show loading sheet
                        showModalBottomSheet(
                          context: context,
                          builder: (c) => const Padding(
                            padding: EdgeInsets.all(32.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircularProgressIndicator(),
                                SizedBox(height: 16),
                                Text('Translating...'),
                              ],
                            ),
                          ),
                        );

                        try {
                          // Fetch translation
                          final result = await ref
                              .read(aiServiceProvider)
                              .translateText(word, story.content,
                                  _selectedModel ?? 'llama3');

                          if (context.mounted && Navigator.canPop(context)) {
                            Navigator.pop(context); // Close loading
                          }

                          if (!context.mounted) return;

                          // Check if already saved
                          final vocabList =
                              ref.read(vocabularyListProvider).value ?? [];
                          final isSaved = vocabList.any((w) =>
                              w.word.toLowerCase() == word.toLowerCase());

                          showModalBottomSheet(
                            context: context,
                            builder: (context) => Container(
                              padding: const EdgeInsets.all(24),
                              width: double.infinity,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        word,
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineMedium,
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          isSaved
                                              ? Icons.bookmark
                                              : Icons.bookmark_border,
                                          color: isSaved ? Colors.indigo : null,
                                        ),
                                        onPressed: () async {
                                          if (isSaved) {
                                            await ref
                                                .read(
                                                    vocabularyRepositoryProvider)
                                                .removeWord(word);
                                            if (context.mounted)
                                              Navigator.pop(context);
                                          } else {
                                            await ref
                                                .read(
                                                    vocabularyRepositoryProvider)
                                                .saveWord(
                                                  word: word,
                                                  definition:
                                                      result['translation'] ??
                                                          '',
                                                  context: story
                                                      .content, // Ideally just the sentence
                                                  targetLanguage: 'en',
                                                );
                                            if (context.mounted)
                                              Navigator.pop(context);
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    result['translation'] ?? '',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge
                                        ?.copyWith(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                        ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    result['definition'] ?? '',
                                    style:
                                        Theme.of(context).textTheme.bodyMedium,
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceEvenly,
                                    children: [
                                      TextButton.icon(
                                        icon: const Icon(Icons.school),
                                        label: const Text('Explain Grammar'),
                                        onPressed: () {
                                          Navigator.pop(context);
                                          _explainText(
                                              word, 'grammar', story.content);
                                        },
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          );
                        } catch (e) {
                          if (context.mounted && Navigator.canPop(context)) {
                            Navigator.pop(context);
                          }
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e')),
                            );
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, -5),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filledTonal(
                        onPressed: () {
                          // Previous sentence (placeholder)
                        },
                        icon: const Icon(Icons.skip_previous),
                      ),
                      const SizedBox(width: 16),
                      IconButton.filled(
                        onPressed: () async {
                          if (_isPlaying) {
                            await ttsService.stop();
                            setState(() => _isPlaying = false);
                          } else {
                            setState(() => _isPlaying = true);
                            // Use German as default for stories
                            String langCode = 'de-DE';
                            if (story.language.isNotEmpty) {
                              // Map language names to codes if needed
                              if (story.language == 'English')
                                langCode = 'en-US';
                              else if (story.language == 'Spanish')
                                langCode = 'es-ES';
                              else if (story.language == 'French')
                                langCode = 'fr-FR';
                              else if (story.language == 'Italian')
                                langCode = 'it-IT';
                            }
                            await ttsService.speak(story.content, langCode);
                          }
                        },
                        icon: Icon(_isPlaying ? Icons.pause : Icons.play_arrow),
                        iconSize: 32,
                      ),
                      const SizedBox(width: 16),
                      IconButton.filledTonal(
                        onPressed: () {
                          // Next sentence (placeholder)
                        },
                        icon: const Icon(Icons.skip_next),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
