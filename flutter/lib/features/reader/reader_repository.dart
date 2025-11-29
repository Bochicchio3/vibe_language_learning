import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../library/library_repository.dart'; // Reuse Story model

final readerRepositoryProvider = Provider<ReaderRepository>((ref) {
  return ReaderRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

final storyDetailsProvider =
    FutureProvider.family<Story?, String>((ref, storyId) {
  return ref.watch(readerRepositoryProvider).getStory(storyId);
});

class ReaderRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  ReaderRepository(this._firestore, this._auth);

  Future<Story?> getStory(String storyId) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return null;

    final doc = await _firestore
        .collection('users')
        .doc(userId)
        .collection('texts')
        .doc(storyId)
        .get();

    if (!doc.exists) return null;

    return Story.fromFirestore(doc);
  }
}
