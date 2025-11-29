import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../library/library_repository.dart'; // Reuse Story model

final readerRepositoryProvider = Provider<ReaderRepository>((ref) {
  return ReaderRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

final storyDetailsProvider = FutureProvider.family<StoryWithContent?, String>((ref, storyId) {
  return ref.watch(readerRepositoryProvider).getStory(storyId);
});

class ReaderRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  ReaderRepository(this._firestore, this._auth);

  Future<StoryWithContent?> getStory(String storyId) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return null;

    final doc = await _firestore
        .collection('users')
        .doc(userId)
        .collection('stories')
        .doc(storyId)
        .get();

    if (!doc.exists) return null;
    
    // We need the content for the reader, which might not be in the list view model
    // But for now, let's assume the Story model has what we need or extend it
    // Actually, let's extend the Story model in library_repository.dart to include content
    // For this step, I'll just map it here manually to a map including content
    return StoryWithContent.fromFirestore(doc);
  }
}

class StoryWithContent extends Story {
  final String content;

  StoryWithContent({
    required super.id,
    required super.title,
    required super.level,
    required super.topic,
    required super.isRead,
    required super.createdAt,
    required this.content,
  });

  factory StoryWithContent.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return StoryWithContent(
      id: doc.id,
      title: data['title'] ?? '',
      level: data['level'] ?? '',
      topic: data['topic'] ?? '',
      isRead: data['isRead'] ?? false,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      content: data['content'] ?? '',
    );
  }
}
