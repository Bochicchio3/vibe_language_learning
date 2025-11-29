import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final vocabularyRepositoryProvider = Provider<VocabularyRepository>((ref) {
  return VocabularyRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

final vocabularyListProvider = StreamProvider<List<VocabWord>>((ref) {
  return ref.watch(vocabularyRepositoryProvider).getVocabulary();
});

class VocabWord {
  final String id;
  final String word;
  final String definition;
  final String context;
  final String targetLanguage;
  final bool isMastered;
  final DateTime nextReview;

  VocabWord({
    required this.id,
    required this.word,
    required this.definition,
    required this.context,
    required this.targetLanguage,
    required this.isMastered,
    required this.nextReview,
  });

  factory VocabWord.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return VocabWord(
      id: doc.id,
      word: data['word'] ?? '',
      definition: data['definition'] ?? '',
      context: data['context'] ?? '',
      targetLanguage: data['targetLanguage'] ?? '',
      isMastered: data['isMastered'] ?? false,
      nextReview: (data['srsData']?['nextReview'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}

class VocabularyRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  VocabularyRepository(this._firestore, this._auth);

  Stream<List<VocabWord>> getVocabulary() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return Stream.value([]);

    return _firestore
        .collection('users')
        .doc(userId)
        .collection('vocabulary')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => VocabWord.fromFirestore(doc)).toList();
    });
  }
}
