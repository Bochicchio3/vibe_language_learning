import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';

final generatorRepositoryProvider = Provider<GeneratorRepository>((ref) {
  return GeneratorRepository(ref.read(dioProvider));
});

class GeneratorRepository {
  final dynamic _apiClient; // Dio instance

  GeneratorRepository(this._apiClient);

  Future<void> generateStory({
    required String topic,
    required String level,
    required String targetLanguage,
  }) async {
    try {
      await _apiClient.post('/stories/generate', data: {
        'topic': topic,
        'level': level,
        'target_language': targetLanguage,
      });
    } catch (e) {
      rethrow;
    }
  }
}
