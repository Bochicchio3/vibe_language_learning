import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'generator_repository.dart';

class GeneratorScreen extends ConsumerStatefulWidget {
  const GeneratorScreen({super.key});

  @override
  ConsumerState<GeneratorScreen> createState() => _GeneratorScreenState();
}

class _GeneratorScreenState extends ConsumerState<GeneratorScreen> {
  final _topicController = TextEditingController();
  String _selectedLevel = 'A1';
  String _selectedLanguage = 'German';
  bool _isLoading = false;

  final List<String> _levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  final List<String> _languages = ['German', 'Spanish', 'French', 'Italian'];

  Future<void> _generate() async {
    if (_topicController.text.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(generatorRepositoryProvider).generateStory(
            topic: _topicController.text.trim(),
            level: _selectedLevel,
            targetLanguage: _selectedLanguage,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Story generated successfully!')),
        );
        context.go('/library');
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
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _selectedLanguage,
              decoration: const InputDecoration(
                labelText: 'Target Language',
                border: OutlineInputBorder(),
              ),
              items: _languages.map((lang) {
                return DropdownMenuItem(value: lang, child: Text(lang));
              }).toList(),
              onChanged: (val) => setState(() => _selectedLanguage = val!),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedLevel,
              decoration: const InputDecoration(
                labelText: 'Level',
                border: OutlineInputBorder(),
              ),
              items: _levels.map((level) {
                return DropdownMenuItem(value: level, child: Text(level));
              }).toList(),
              onChanged: (val) => setState(() => _selectedLevel = val!),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                labelText: 'Topic',
                hintText: 'e.g., A day at the beach',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _isLoading ? null : _generate,
              child: _isLoading
                  ? const CircularProgressIndicator()
                  : const Text('Generate'),
            ),
          ],
        ),
      ),
    );
  }
}
