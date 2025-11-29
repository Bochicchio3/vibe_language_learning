import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(
    FirebaseFirestore.instance,
    FirebaseAuth.instance,
    ref.read(dioProvider),
  );
});

final chatMessagesProvider = StreamProvider.family<List<ChatMessage>, String>((ref, conversationId) {
  return ref.watch(chatRepositoryProvider).getMessages(conversationId);
});

class ChatMessage {
  final String id;
  final String role;
  final String content;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
  });

  factory ChatMessage.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ChatMessage(
      id: doc.id,
      role: data['role'] ?? 'user',
      content: data['content'] ?? '',
      timestamp: (data['timestamp'] as Timestamp).toDate(),
    );
  }
}

class ChatRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;
  final dynamic _apiClient; // Dio instance

  ChatRepository(this._firestore, this._auth, this._apiClient);

  Stream<List<ChatMessage>> getMessages(String conversationId) {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return Stream.value([]);

    return _firestore
        .collection('users')
        .doc(userId)
        .collection('chat_history')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => ChatMessage.fromFirestore(doc)).toList();
    });
  }

  Future<void> sendMessage(String conversationId, String message) async {
    // 1. Optimistic update to Firestore (optional, but good UX)
    // 2. Call Backend API
    try {
      await _apiClient.post('/chat/send', data: {
        'conversationId': conversationId,
        'message': message,
      });
    } catch (e) {
      // Handle error
      rethrow;
    }
  }
}
