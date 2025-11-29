import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

final aiServiceProvider = Provider<AiService>((ref) {
  return AiService();
});

class AiService {
  late final Dio _dio;

  AiService() {
    String baseUrl = 'http://localhost:11434/api';
    // Use defaultTargetPlatform to avoid importing dart:io which breaks Web
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      baseUrl = 'http://10.0.2.2:11434/api';
    }

    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 60),
    ));
  }

  Future<List<String>> fetchModels() async {
    try {
      final response =
          await _dio.get('/tags'); // Ollama API for models is /api/tags
      if (response.statusCode == 200) {
        final data = response.data;
        final models =
            (data['models'] as List).map((m) => m['name'] as String).toList();
        return models;
      }
      return [];
    } catch (e) {
      print('Error fetching models: $e');
      return [];
    }
  }

  Future<String> simplifyStory(String text, String level, String model) async {
    const systemPrompt = '''
You are a German language teacher.
Rewrite the following text to be suitable for a learner at the A2 level.
Keep the meaning of the story but use simpler vocabulary and grammar.
IMPORTANT: Return ONLY the simplified text. Do not include any intro or outro.
''';

    try {
      final response = await _dio.post('/chat', data: {
        'model': model,
        'messages': [
          {'role': 'system', 'content': systemPrompt},
          {'role': 'user', 'content': text}
        ],
        'stream': false,
      });

      if (response.statusCode == 200) {
        return response.data['message']['content'] ?? 'Failed to simplify.';
      }
      throw Exception('Failed to simplify story');
    } catch (e) {
      print('Error simplifying story: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> explainText(
      String text, String template, String context, String model) async {
    final prompts = {
      'grammar': '''
You are a German language teacher. Analyze the grammar in this German text:
"$text"
${context.isNotEmpty ? 'Context: "$context"' : ''}

Explain the grammatical structures in a clear, educational way.

Return ONLY valid JSON with this structure:
{
  "summary": "Brief overview of main grammatical points (1-2 sentences)",
  "structures": [
    {
      "element": "grammatical element (e.g., 'den Mann')",
      "explanation": "what it is and why (e.g., 'Accusative case - direct object')"
    }
  ],
  "tips": ["Helpful tip 1", "Helpful tip 2"]
}
Do not include markdown formatting. Just the raw JSON string.
''',
      'sentence': '''
You are a German language teacher. Explain this German sentence to a learner:
"$text"
${context.isNotEmpty ? 'Context: "$context"' : ''}

Provide translation and breakdown.

Return ONLY valid JSON with this structure:
{
  "translation": "English translation of the sentence",
  "breakdown": [
    {
      "part": "word or phrase from the sentence",
      "meaning": "its meaning/function in this context"
    }
  ],
  "notes": "Any important notes about usage, idioms, or nuances"
}
Do not include markdown formatting. Just the raw JSON string.
''',
      'word': '''
You are a German language teacher. Explain this German word or phrase:
"$text"
${context.isNotEmpty ? 'In context: "$context"' : ''}

Provide detailed explanation for a language learner.

Return ONLY valid JSON with this structure:
{
  "translation": "English translation",
  "explanation": "Detailed explanation of meaning and usage",
  "examples": [
    {"german": "Example sentence 1", "english": "Translation 1"},
    {"german": "Example sentence 2", "english": "Translation 2"}
  ],
  "tips": "Learning tips or common mistakes to avoid"
}
Do not include markdown formatting. Just the raw JSON string.
'''
    };

    final prompt = prompts[template] ?? prompts['sentence'];

    try {
      final response = await _dio.post('/chat', data: {
        'model': model,
        'messages': [
          {'role': 'system', 'content': prompt},
          {'role': 'user', 'content': 'Explain now.'}
        ],
        'stream': false,
        'format': 'json',
      });

      if (response.statusCode == 200) {
        String content = response.data['message']['content'];
        // Cleanup markdown if present
        content =
            content.replaceAll('```json', '').replaceAll('```', '').trim();
        return jsonDecode(content);
      }
      throw Exception('Failed to explain text');
    } catch (e) {
      print('Error explaining text: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> generateStory({
    required String topic,
    required String level,
    required String length,
    required String model,
    String theme = '',
    String targetLanguage = 'German',
  }) async {
    final lengthMap = {
      "Short": "approx 100 words",
      "Medium": "approx 250 words",
      "Long": "approx 500 words"
    };

    final systemPrompt = '''
You are a $targetLanguage language teacher.
Write a $targetLanguage story about "$topic"${theme.isNotEmpty ? ' with a theme of "$theme"' : ''} for a learner at $level level.
Length: ${lengthMap[length] ?? "approx 200 words"}.

IMPORTANT: Return ONLY valid JSON with the following structure:
{
  "title": "The Title",
  "content": "The story text..."
}
Do not include markdown formatting (like ```json) in the response. Just the raw JSON string.
''';

    try {
      final response = await _dio.post('/chat', data: {
        'model': model,
        'messages': [
          {'role': 'system', 'content': systemPrompt},
          {'role': 'user', 'content': 'Generate the story now.'}
        ],
        'stream': false,
        'format': 'json',
      });

      if (response.statusCode == 200) {
        String content = response.data['message']['content'];
        content =
            content.replaceAll('```json', '').replaceAll('```', '').trim();
        return jsonDecode(content);
      }
      throw Exception('Failed to generate story');
    } catch (e) {
      print('Error generating story: $e');
      rethrow;
    }
  }

  Future<String> chat({
    required List<Map<String, String>> messages,
    required String model,
  }) async {
    try {
      final response = await _dio.post('/chat', data: {
        'model': model,
        'messages': messages,
        'stream': false,
      });

      if (response.statusCode == 200) {
        return response.data['message']['content'] ?? '...';
      }
      throw Exception('Failed to chat');
    } catch (e) {
      print('Error chatting: $e');
      rethrow;
    }
  }

  Future<List<dynamic>> generateFlashcards({
    required String topic,
    required String level,
    required String model,
    int count = 10,
    String targetLanguage = 'German',
  }) async {
    final systemPrompt = '''
You are a $targetLanguage language teacher.
Generate $count $targetLanguage vocabulary flashcards related to the topic "$topic" for a learner at the $level level.
Each flashcard must include:
- "word": The $targetLanguage word or phrase.
- "definition": A simple definition or synonym (or English translation if appropriate).
- "context": A simple example sentence in $targetLanguage using the word.
- "gender": null (or gender if applicable for the language).

IMPORTANT: Return ONLY a valid JSON array of objects.
Example:
[
  { "word": "word1", "definition": "definition1", "context": "example sentence 1", "gender": null },
  { "word": "word2", "definition": "definition2", "context": "example sentence 2", "gender": null }
]
Do not include any markdown formatting like ```json. Just the raw JSON array.
''';

    try {
      final response = await _dio.post('/chat', data: {
        'model': model,
        'messages': [
          {'role': 'system', 'content': systemPrompt},
          {'role': 'user', 'content': 'Generate the flashcards now.'}
        ],
        'stream': false,
        'format': 'json',
      });

      if (response.statusCode == 200) {
        String content = response.data['message']['content'];
        content =
            content.replaceAll('```json', '').replaceAll('```', '').trim();

        final parsed = jsonDecode(content);
        if (parsed is List) return parsed;
        if (parsed is Map && parsed.containsKey('flashcards'))
          return parsed['flashcards'];

        return [];
      }
      throw Exception('Failed to generate flashcards');
    } catch (e) {
      print('Error generating flashcards: $e');
      rethrow;
    }
  }

  Future<Map<String, String>> translateText(
      String text, String context, String model) async {
    const systemPrompt = '''
You are a helpful translator.
Translate the following German word or phrase into English.
Provide the translation and a brief definition/explanation.

IMPORTANT: Return ONLY valid JSON with the following structure:
{
  "translation": "The English translation",
  "definition": "A brief definition or explanation"
}
Do not include markdown formatting. Just the raw JSON string.
''';

    try {
      final response = await _dio.post('/chat', data: {
        'model': model,
        'messages': [
          {'role': 'system', 'content': systemPrompt},
          {'role': 'user', 'content': 'Translate: "$text". Context: "$context"'}
        ],
        'stream': false,
        'format': 'json',
      });

      if (response.statusCode == 200) {
        String content = response.data['message']['content'];
        content =
            content.replaceAll('```json', '').replaceAll('```', '').trim();
        final Map<String, dynamic> decoded = jsonDecode(content);
        return {
          'translation': decoded['translation']?.toString() ?? '',
          'definition': decoded['definition']?.toString() ?? '',
        };
      }
      throw Exception('Failed to translate text');
    } catch (e) {
      print('Error translating text: $e');
      return {'translation': 'Error', 'definition': 'Could not translate'};
    }
  }
}
