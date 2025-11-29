import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final libraryRepositoryProvider = Provider<LibraryRepository>((ref) {
  return LibraryRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

final libraryStoriesProvider = StreamProvider<List<Story>>((ref) {
  return ref.watch(libraryRepositoryProvider).getStories();
});

class Story {
  final String id;
  final String title;
  final String level;
  final String topic;
  final bool isRead;
  final DateTime createdAt;

  Story({
    required this.id,
    required this.title,
    required this.level,
    required this.topic,
    required this.isRead,
    required this.createdAt,
  });

  factory Story.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Story(
      id: doc.id,
      title: data['title'] ?? '',
      level: data['level'] ?? '',
      topic: data['topic'] ?? '',
      isRead: data['isRead'] ?? false,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }
}

class LibraryRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  LibraryRepository(this._firestore, this._auth);

  Stream<List<Story>> getStories() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return Stream.value([]);

    return _firestore
        .collection('users')
        .doc(userId)
        .collection('stories')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Story.fromFirestore(doc)).toList();
    });
  }
}
