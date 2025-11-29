import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final booksRepositoryProvider = Provider<BooksRepository>((ref) {
  return BooksRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

final booksListProvider = StreamProvider<List<Book>>((ref) {
  return ref.watch(booksRepositoryProvider).getBooks();
});

final bookDetailsProvider = FutureProvider.family<Book?, String>((ref, bookId) {
  return ref.watch(booksRepositoryProvider).getBook(bookId);
});

class Book {
  final String id;
  final String title;
  final String author;
  final String level;
  final String coverImage;
  final int totalChapters;
  final int currentChapter;
  final List<Chapter> chapters;
  final DateTime createdAt;

  Book({
    required this.id,
    required this.title,
    required this.author,
    required this.level,
    required this.coverImage,
    required this.totalChapters,
    required this.currentChapter,
    required this.chapters,
    required this.createdAt,
  });

  factory Book.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Book(
      id: doc.id,
      title: data['title'] ?? '',
      author: data['author'] ?? '',
      level: data['level'] ?? '',
      coverImage: data['coverImage'] ?? '',
      totalChapters: data['totalChapters'] ?? 0,
      currentChapter: data['currentChapter'] ?? 0,
      chapters: (data['chapters'] as List<dynamic>?)
              ?.map((c) => Chapter.fromMap(c))
              .toList() ??
          [],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }
}

class Chapter {
  final String title;
  final String content;
  final int wordCount;
  final bool isCompleted;

  Chapter({
    required this.title,
    required this.content,
    required this.wordCount,
    required this.isCompleted,
  });

  factory Chapter.fromMap(Map<String, dynamic> map) {
    return Chapter(
      title: map['title'] ?? '',
      content: map['content'] ?? '',
      wordCount: map['wordCount'] ?? 0,
      isCompleted: map['isCompleted'] ?? false,
    );
  }
}

class BooksRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  BooksRepository(this._firestore, this._auth);

  Stream<List<Book>> getBooks() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return Stream.value([]);

    return _firestore
        .collection('users')
        .doc(userId)
        .collection('books')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Book.fromFirestore(doc)).toList();
    });
  }

  Future<Book?> getBook(String bookId) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return null;

    final doc = await _firestore
        .collection('users')
        .doc(userId)
        .collection('books')
        .doc(bookId)
        .get();

    if (!doc.exists) return null;
    return Book.fromFirestore(doc);
  }
}
