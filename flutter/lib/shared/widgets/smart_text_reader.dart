import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/utils/text_utils.dart';
import '../../services/ai_service.dart';
import '../../services/tts_service.dart';
import '../../features/vocabulary/vocabulary_repository.dart';
import '../../features/reader/widgets/interactive_text.dart';

class NextChapterIntent extends Intent {
  const NextChapterIntent();
}

class PreviousChapterIntent extends Intent {
  const PreviousChapterIntent();
}

class SmartTextReader extends ConsumerStatefulWidget {
  final String content;
  final String title;
  final String? subtitle;
  final String language; // 'English', 'Spanish', etc.
  final VoidCallback? onNext;
  final VoidCallback? onPrevious;

  const SmartTextReader({
    super.key,
    required this.content,
    required this.title,
    this.subtitle,
    this.language = 'German',
    this.onNext,
    this.onPrevious,
  });

  @override
  ConsumerState<SmartTextReader> createState() => _SmartTextReaderState();
}

class _SmartTextReaderState extends ConsumerState<SmartTextReader> {
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
    _calculateTokenOffsets(widget.content);

    // Listen to TTS progress
    final ttsService = ref.read(ttsServiceProvider);
    ttsService.progressStream.listen((startOffset) {
      if (startOffset == -1) {
        if (mounted) setState(() => _highlightedTokenIndex = null);
        return;
      }

      // Find token containing startOffset
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

  @override
  void didUpdateWidget(SmartTextReader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.content != widget.content) {
      // Reset state when content changes
      _simplifiedContent = null;
      _showingSimplified = false;
      _calculateTokenOffsets(widget.content);
      if (_isPlaying) {
        ref.read(ttsServiceProvider).stop();
        _isPlaying = false;
      }
    }
  }

  @override
  void dispose() {
    // ref.read() is unsafe in dispose.
    // If we want to stop TTS, we should use a PopScope or handle it elsewhere.
    // For now, removing the unsafe call to prevent crashes.
    super.dispose();
  }

  Future<void> _fetchModels() async {
    try {
      final models = await ref.read(aiServiceProvider).fetchModels();
      if (mounted) {
        setState(() {
          _models = models;
          if (models.isNotEmpty) _selectedModel = models.first;
        });
      }
    } catch (e) {
      debugPrint('Error fetching models: $e');
      // Fail silently or show a non-intrusive error if critical
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

  Future<void> _simplifyText() async {
    if (_selectedModel == null) return;

    setState(() => _isSimplifying = true);
    try {
      final simplified = await ref
          .read(aiServiceProvider)
          .simplifyStory(widget.content, 'A2', _selectedModel!);
      if (mounted) {
        setState(() {
          _simplifiedContent = simplified;
          _showingSimplified = true;
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

  Future<void> _explainText(String text, String template) async {
    if (_selectedModel == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final result = await ref
          .read(aiServiceProvider)
          .explainText(text, template, widget.content, _selectedModel!);

      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context); // Hide loading

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
                    Text(result.toString()), // TODO: Pretty print JSON
                  ],
                ),
              );
            },
          ),
        );
      }
    } catch (e) {
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to explain: $e')),
        );
      }
    }
  }

  String _getLangCode(String languageName) {
    switch (languageName.toLowerCase()) {
      case 'english':
        return 'en-US';
      case 'spanish':
        return 'es-ES';
      case 'french':
        return 'fr-FR';
      case 'italian':
        return 'it-IT';
      case 'german':
      default:
        return 'de-DE';
    }
  }

  @override
  Widget build(BuildContext context) {
    final ttsService = ref.watch(ttsServiceProvider);
    final displayContent = _showingSimplified && _simplifiedContent != null
        ? _simplifiedContent!
        : widget.content;

    return Shortcuts(
      shortcuts: <LogicalKeySet, Intent>{
        LogicalKeySet(LogicalKeyboardKey.arrowRight): const NextChapterIntent(),
        LogicalKeySet(LogicalKeyboardKey.arrowLeft):
            const PreviousChapterIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          NextChapterIntent: CallbackAction<NextChapterIntent>(
            onInvoke: (NextChapterIntent intent) => widget.onNext?.call(),
          ),
          PreviousChapterIntent: CallbackAction<PreviousChapterIntent>(
            onInvoke: (PreviousChapterIntent intent) =>
                widget.onPrevious?.call(),
          ),
        },
        child: Focus(
          autofocus: true,
          child: Scaffold(
            appBar: AppBar(
              title: Text(widget.title),
              actions: [
                if (_models.isNotEmpty)
                  IconButton(
                    icon: _isSimplifying
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Icon(_showingSimplified
                            ? Icons.undo
                            : Icons.auto_fix_high),
                    tooltip:
                        _showingSimplified ? 'Show Original' : 'Simplify Text',
                    onPressed: _isSimplifying
                        ? null
                        : () {
                            if (_showingSimplified) {
                              setState(() {
                                _showingSimplified = false;
                                _calculateTokenOffsets(widget.content);
                              });
                            } else {
                              if (_simplifiedContent != null) {
                                setState(() {
                                  _showingSimplified = true;
                                  _calculateTokenOffsets(_simplifiedContent!);
                                });
                              } else {
                                _simplifyText();
                              }
                            }
                          },
                  ),
              ],
            ),
            body: Stack(
              children: [
                SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (widget.subtitle != null) ...[
                        Text(
                          widget.subtitle!,
                          style: Theme.of(context)
                              .textTheme
                              .labelLarge
                              ?.copyWith(
                                color: Theme.of(context).colorScheme.secondary,
                              ),
                        ),
                        const Divider(height: 32),
                      ],
                      InteractiveText(
                        text: displayContent,
                        highlightedTokenIndex: _highlightedTokenIndex,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              height: 1.8,
                              fontSize: 18,
                            ),
                        onWordTap: (word) =>
                            _handleWordTap(word, displayContent),
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
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 10,
                          offset: const Offset(0, -5),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton.filledTonal(
                          onPressed: widget.onPrevious,
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
                              await ttsService.speak(displayContent,
                                  _getLangCode(widget.language));
                            }
                          },
                          icon:
                              Icon(_isPlaying ? Icons.pause : Icons.play_arrow),
                          iconSize: 32,
                        ),
                        const SizedBox(width: 16),
                        IconButton.filledTonal(
                          onPressed: widget.onNext,
                          icon: const Icon(Icons.skip_next),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleWordTap(String word, String contextStr) async {
    // Highlight immediately
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
      final result = await ref
          .read(aiServiceProvider)
          .translateText(word, contextStr, _selectedModel ?? 'llama3');

      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }

      if (!mounted) return;

      final vocabList = ref.read(vocabularyListProvider).value ?? [];
      final isSaved =
          vocabList.any((w) => w.word.toLowerCase() == word.toLowerCase());

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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    word,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  IconButton(
                    icon: Icon(
                      isSaved ? Icons.bookmark : Icons.bookmark_border,
                      color: isSaved ? Colors.indigo : null,
                    ),
                    onPressed: () async {
                      if (isSaved) {
                        await ref
                            .read(vocabularyRepositoryProvider)
                            .removeWord(word);
                        if (context.mounted) Navigator.pop(context);
                      } else {
                        await ref.read(vocabularyRepositoryProvider).saveWord(
                              word: word,
                              definition: result['translation'] ?? '',
                              context: contextStr,
                              targetLanguage: 'en',
                            );
                        if (context.mounted) Navigator.pop(context);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                result['translation'] ?? '',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                result['definition'] ?? '',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton.icon(
                    icon: const Icon(Icons.school),
                    label: const Text('Explain Grammar'),
                    onPressed: () {
                      Navigator.pop(context);
                      _explainText(word, 'grammar');
                    },
                  ),
                ],
              )
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}
