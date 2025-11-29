import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/data/auth_repository.dart';

final vocabularyRepositoryProvider = Provider<VocabularyRepository>((ref) {
  return VocabularyRepository(
      FirebaseFirestore.instance, FirebaseAuth.instance);
});

final vocabularyListProvider = StreamProvider<List<VocabWord>>((ref) {
  final authState = ref.watch(authStateChangesProvider);
  return authState.when(
    data: (user) {
      if (user == null) return Stream.value([]);
      return ref.watch(vocabularyRepositoryProvider).getVocabulary(user.uid);
    },
    loading: () => const Stream.empty(),
    error: (_, __) => Stream.value([]),
  );
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
      word: data['word'] ?? data['term'] ?? '',
      definition: data['definition'] ?? data['translation'] ?? '',
      context: data['context'] ?? data['sentence'] ?? '',
      targetLanguage: data['targetLanguage'] ?? 'German',
      isMastered: data['isMastered'] ?? false,
      nextReview: (data['srsData']?['nextReview'] as Timestamp?)?.toDate() ??
          DateTime.now(),
    );
  }
}

class VocabularyRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  VocabularyRepository(this._firestore, this._auth);

  Stream<List<VocabWord>> getVocabulary(String userId) {
    final collectionRef =
        _firestore.collection('users').doc(userId).collection('vocabulary');

    print('DEBUG: Fetching from path: ${collectionRef.path}');

    // Debug: One-time fetch to verify data existence
    collectionRef.get().then((snap) {
      print('DEBUG: One-time fetch found ${snap.docs.length} docs');
      for (var doc in snap.docs) {
        print('DEBUG DOC: ${doc.id} => ${doc.data()}');
      }
      return null;
    }).catchError((e) {
      print('DEBUG ERROR: $e');
      return null;
    });

    return collectionRef
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      print('STREAM: Fetched ${snapshot.docs.length} words');
      return snapshot.docs.map((doc) => VocabWord.fromFirestore(doc)).toList();
    });
  }

  Future<void> saveWord({
    required String word,
    required String definition,
    required String context,
    required String targetLanguage,
  }) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return;

    // Check if word already exists to avoid duplicates
    final query = await _firestore
        .collection('users')
        .doc(userId)
        .collection('vocabulary')
        .where('word', isEqualTo: word)
        .get();

    if (query.docs.isNotEmpty) return;

    await _firestore
        .collection('users')
        .doc(userId)
        .collection('vocabulary')
        .add({
      'word': word,
      'definition': definition,
      'context': context,
      'targetLanguage': targetLanguage,
      'isMastered': false,
      'createdAt': FieldValue.serverTimestamp(),
      'srsData': {
        'nextReview': FieldValue.serverTimestamp(),
        'interval': 0,
        'repetition': 0,
        'easeFactor': 2.5,
      },
    });
  }

  Future<void> removeWord(String word) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return;

    final query = await _firestore
        .collection('users')
        .doc(userId)
        .collection('vocabulary')
        .where('word', isEqualTo: word)
        .get();

    for (final doc in query.docs) {
      await doc.reference.delete();
    }
  }
}
