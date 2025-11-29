import '../library_repository.dart';
import '../../vocabulary/vocabulary_repository.dart';

class StoryStats {
  final int totalWords;
  final int readingTimeMinutes;
  final int unknownCount;
  final int unknownPercent;

  StoryStats({
    required this.totalWords,
    required this.readingTimeMinutes,
    required this.unknownCount,
    required this.unknownPercent,
  });
}

StoryStats calculateStoryStats(Story story, List<VocabWord> vocabList) {
  if (story.content.isEmpty) {
    return StoryStats(
      totalWords: 0,
      readingTimeMinutes: 0,
      unknownCount: 0,
      unknownPercent: 0,
    );
  }

  // Simple tokenization (matching React logic roughly)
  final words = story.content
      .split(RegExp(r'([^\w\u00C0-\u00FF]+)')) // Include accented chars
      .where((w) => w.trim().isNotEmpty && RegExp(r'\w').hasMatch(w))
      .toList();

  final totalWords = words.length;
  final readingTimeMinutes = (totalWords / 200).ceil(); // ~200 wpm

  if (totalWords == 0) {
    return StoryStats(
      totalWords: 0,
      readingTimeMinutes: 0,
      unknownCount: 0,
      unknownPercent: 0,
    );
  }

  // Get unique words (case-insensitive)
  final uniqueWords = <String>{};
  for (final word in words) {
    uniqueWords.add(word.toLowerCase());
  }

  // Count unknown words (present in vocab list)
  // vocabList words are stored as is, so we should check against them
  // React logic: checks if word is in savedVocab
  // We need to normalize vocab words too for comparison
  final vocabSet = vocabList.map((v) => v.word.toLowerCase()).toSet();

  int unknownCount = 0;
  for (final word in uniqueWords) {
    if (vocabSet.contains(word)) {
      unknownCount++;
    }
  }

  final unknownPercent = ((unknownCount / uniqueWords.length) * 100).round();

  return StoryStats(
    totalWords: uniqueWords.length, // React uses unique words for stats
    readingTimeMinutes: readingTimeMinutes,
    unknownCount: unknownCount,
    unknownPercent: unknownPercent,
  );
}
