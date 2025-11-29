import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

final ttsServiceProvider = Provider<TtsService>((ref) {
  return TtsService();
});

class TtsService {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isPlaying = false;
  bool get isPlaying => _isPlaying;

  final _progressController = StreamController<int>.broadcast();
  Stream<int> get progressStream => _progressController.stream;

  TtsService() {
    _init();
  }

  Future<void> _init() async {
    await _flutterTts.setLanguage("de-DE"); // Default to German
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);

    _flutterTts.setStartHandler(() {
      _isPlaying = true;
    });

    _flutterTts.setCompletionHandler(() {
      _isPlaying = false;
      _progressController.add(-1); // Signal completion
    });

    _flutterTts.setCancelHandler(() {
      _isPlaying = false;
      _progressController.add(-1);
    });

    _flutterTts
        .setProgressHandler((String text, int start, int end, String word) {
      _progressController.add(start);
    });
  }

  Future<void> speak(String text, String languageCode) async {
    await _flutterTts.setLanguage(languageCode);
    await _flutterTts.speak(text);
  }

  Future<void> stop() async {
    await _flutterTts.stop();
  }

  Future<void> setRate(double rate) async {
    await _flutterTts.setSpeechRate(rate);
  }

  void dispose() {
    _progressController.close();
  }
}
