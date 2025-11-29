import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../services/ai_service.dart';
import '../library/library_repository.dart';

class GeneratorScreen extends ConsumerStatefulWidget {
  const GeneratorScreen({super.key});

  @override
  ConsumerState<GeneratorScreen> createState() => _GeneratorScreenState();
}

class _GeneratorScreenState extends ConsumerState<GeneratorScreen> {
  final _topicController = TextEditingController();
  final _themeController = TextEditingController();

  String _selectedLevel = 'A1';
  String _selectedLanguage = 'German';
  String _selectedLength = 'Medium';
  String? _selectedModel;

  bool _isLoading = false;
  List<String> _models = [];

  final List<String> _levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  final List<String> _languages = ['German', 'Spanish', 'French', 'Italian'];
  final List<String> _lengths = ['Short', 'Medium', 'Long'];

  @override
  void initState() {
    super.initState();
    _fetchModels();
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

  Future<void> _generate() async {
    if (_topicController.text.isEmpty || _selectedModel == null) return;

    setState(() => _isLoading = true);
    try {
      final storyData = await ref.read(aiServiceProvider).generateStory(
            topic: _topicController.text.trim(),
            level: _selectedLevel,
            length: _selectedLength,
            model: _selectedModel!,
            theme: _themeController.text.trim(),
            targetLanguage: _selectedLanguage,
          );

      // Save to Library
      final storyId = DateTime.now().millisecondsSinceEpoch.toString();
      final story = Story(
        id: storyId,
        title: storyData['title'] ?? 'Untitled',
        content: storyData['content'] ?? '',
        level: _selectedLevel,
        topic: _topicController.text.trim(),
        imageUrl: 'assets/images/placeholder.png', // Placeholder
        isPublic: false,
        language: _selectedLanguage,
        isRead: false,
        createdAt: DateTime.now(),
      );

      await ref.read(libraryRepositoryProvider).saveStory(story);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Story generated and saved!')),
        );
        context.go('/read/$storyId');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Generate Story')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_models.isEmpty)
              const Card(
                color: Colors.orangeAccent,
                child: Padding(
                  padding: EdgeInsets.all(8.0),
                  child: Text('No Ollama models found. Is Ollama running?'),
                ),
              ),
            const SizedBox(height: 16),

            // Model Selection
            DropdownButtonFormField<String>(
              value: _selectedModel,
              decoration: const InputDecoration(
                labelText: 'AI Model',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.smart_toy),
              ),
              items: _models
                  .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                  .toList(),
              onChanged: (val) => setState(() => _selectedModel = val),
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedLanguage,
                    decoration: const InputDecoration(
                      labelText: 'Language',
                      border: OutlineInputBorder(),
                    ),
                    items: _languages
                        .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                        .toList(),
                    onChanged: (val) =>
                        setState(() => _selectedLanguage = val!),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedLevel,
                    decoration: const InputDecoration(
                      labelText: 'Level',
                      border: OutlineInputBorder(),
                    ),
                    items: _levels
                        .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                        .toList(),
                    onChanged: (val) => setState(() => _selectedLevel = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            DropdownButtonFormField<String>(
              value: _selectedLength,
              decoration: const InputDecoration(
                labelText: 'Length',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.format_size),
              ),
              items: _lengths
                  .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                  .toList(),
              onChanged: (val) => setState(() => _selectedLength = val!),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                labelText: 'Topic',
                hintText: 'e.g., A day at the beach',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.topic),
              ),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _themeController,
              decoration: const InputDecoration(
                labelText: 'Theme (Optional)',
                hintText: 'e.g., Mystery, Sci-Fi',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.palette),
              ),
            ),
            const SizedBox(height: 24),

            FilledButton.icon(
              onPressed:
                  _isLoading || _selectedModel == null ? null : _generate,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.auto_awesome),
              label: Text(_isLoading ? 'Generating...' : 'Generate Story'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
