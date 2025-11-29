import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/data/auth_repository.dart';

final libraryRepositoryProvider = Provider<LibraryRepository>((ref) {
  return LibraryRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

class Story {
  final String id;
  final String title;
  final String level;
  final String topic;
  final String content;
  final bool isRead;
  final DateTime createdAt;
  final String imageUrl;
  final bool isPublic;
  final String language;

  Story({
    required this.id,
    required this.title,
    required this.level,
    required this.topic,
    required this.content,
    required this.isRead,
    required this.createdAt,
    this.imageUrl = '',
    this.isPublic = false,
    this.language = 'German',
  });

  factory Story.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Story(
      id: doc.id,
      title: data['title'] ?? '',
      level: data['level'] ?? '',
      topic: data['topic'] ?? '',
      content: data['content'] ?? '',
      isRead: data['isRead'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      imageUrl: data['imageUrl'] ?? '',
      isPublic: data['isPublic'] ?? false,
      language: data['language'] ?? 'German',
    );
  }
}

class LibraryRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  LibraryRepository(this._firestore, this._auth);

  Stream<List<Story>> getStories(String userId) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('texts')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Story.fromFirestore(doc)).toList();
    });
  }

  Stream<List<Story>> getPublicStories() {
    return _firestore
        .collection('texts')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Story.fromFirestore(doc)).toList();
    });
  }

  Future<void> saveStory(Story story) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) throw Exception('User not logged in');

    await _firestore
        .collection('users')
        .doc(userId)
        .collection('texts')
        .doc(story.id)
        .set({
      'title': story.title,
      'level': story.level,
      'topic': story.topic,
      'content': story.content,
      'isRead': story.isRead,
      'createdAt': Timestamp.fromDate(story.createdAt),
      'imageUrl': story.imageUrl,
      'isPublic': story.isPublic,
      'language': story.language,
    });
  }
}

final libraryStoriesProvider =
    StreamProvider.family<List<Story>, bool>((ref, isPublic) {
  final authState = ref.watch(authStateChangesProvider);
  final repository = ref.watch(libraryRepositoryProvider);

  if (isPublic) {
    return repository.getPublicStories();
  }

  return authState.when(
    data: (user) {
      if (user == null) return Stream.value([]);
      return repository.getStories(user.uid);
    },
    loading: () => const Stream.empty(),
    error: (_, __) => Stream.value([]),
  );
});
