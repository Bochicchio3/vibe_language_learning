import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'vocabulary_repository.dart';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../auth/data/auth_repository.dart';
import '../../services/ai_service.dart';

class VocabDashboard extends ConsumerStatefulWidget {
  const VocabDashboard({super.key});

  @override
  ConsumerState<VocabDashboard> createState() => _VocabDashboardState();
}

class _VocabDashboardState extends ConsumerState<VocabDashboard> {
  bool _isGenerating = false;

  Future<void> _generateFlashcards() async {
    final topicController = TextEditingController();
    String selectedLevel = 'A1';
    final levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    final shouldGenerate = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate Flashcards'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: topicController,
              decoration: const InputDecoration(
                labelText: 'Topic',
                hintText: 'e.g., Travel, Food',
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: selectedLevel,
              decoration: const InputDecoration(labelText: 'Level'),
              items: levels
                  .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                  .toList(),
              onChanged: (val) => selectedLevel = val!,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Generate'),
          ),
        ],
      ),
    );

    if (shouldGenerate == true && topicController.text.isNotEmpty) {
      setState(() => _isGenerating = true);
      try {
        final models = await ref.read(aiServiceProvider).fetchModels();
        if (models.isEmpty) throw Exception('No AI models available');

        final flashcards = await ref.read(aiServiceProvider).generateFlashcards(
              topic: topicController.text,
              level: selectedLevel,
              model: models.first,
            );

        int savedCount = 0;
        for (final card in flashcards) {
          if (card is Map) {
            await ref.read(vocabularyRepositoryProvider).saveWord(
                  word: card['word'] ?? '',
                  definition: card['definition'] ?? '',
                  context: card['context'] ?? '',
                  targetLanguage: 'German', // TODO: Make dynamic
                );
            savedCount++;
          }
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('Generated and saved $savedCount flashcards!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      } finally {
        if (mounted) setState(() => _isGenerating = false);
      }
    }
  }

  Future<void> _dumpDebugData() async {
    try {
      final user = ref.read(authRepositoryProvider).currentUser;
      if (user == null) throw Exception('No user logged in');

      final firestore = FirebaseFirestore.instance;
      final userDoc = await firestore.collection('users').doc(user.uid).get();
      final vocabSnapshot = await firestore
          .collection('users')
          .doc(user.uid)
          .collection('vocabulary')
          .get();

      final debugData = {
        'userId': user.uid,
        'userDocExists': userDoc.exists,
        'userDocData': userDoc.data(),
        'vocabCount': vocabSnapshot.docs.length,
        'vocabData':
            vocabSnapshot.docs.map((d) => {'id': d.id, ...d.data()}).toList(),
      };

      final jsonStr = const JsonEncoder.withIndent('  ').convert(debugData);
      print('DEBUG DUMP:\n$jsonStr');

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Debug Data Dump'),
            content: SingleChildScrollView(
              child: SelectableText(jsonStr),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      print('Debug dump error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Debug error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final vocabAsync = ref.watch(vocabularyListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Vocabulary'),
        actions: [
          if (_isGenerating)
            const Padding(
              padding: EdgeInsets.only(right: 16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.auto_awesome),
              onPressed: _generateFlashcards,
              tooltip: 'Generate with AI',
            ),
          IconButton(
            icon: const Icon(Icons.style),
            onPressed: () {
              context.push('/flashcards');
            },
            tooltip: 'Practice Flashcards',
          ),
          IconButton(
            icon: const Icon(Icons.bug_report),
            onPressed: _dumpDebugData,
            tooltip: 'Debug Data Dump',
          ),
        ],
      ),
      body: vocabAsync.when(
        data: (words) {
          if (words.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No words saved yet.'),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _generateFlashcards,
                    icon: const Icon(Icons.auto_awesome),
                    label: const Text('Generate Flashcards'),
                  ),
                ],
              ),
            );
          }

          final masteredCount = words.where((w) => w.isMastered).length;
          final dueCount =
              words.where((w) => w.nextReview.isBefore(DateTime.now())).length;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Total Words',
                        value: words.length.toString(),
                        icon: Icons.list,
                        color: Colors.blue,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        label: 'Due',
                        value: dueCount.toString(),
                        icon: Icons.notifications,
                        color: Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        label: 'Mastered',
                        value: masteredCount.toString(),
                        icon: Icons.check_circle,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: words.length,
                  itemBuilder: (context, index) {
                    final word = words[index];
                    return ListTile(
                      title: Text(word.word),
                      subtitle: Text(word.definition),
                      trailing: word.isMastered
                          ? const Icon(Icons.star, color: Colors.amber)
                          : null,
                    );
                  },
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

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}
