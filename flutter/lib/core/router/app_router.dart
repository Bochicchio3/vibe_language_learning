import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/library/library_screen.dart';
import '../../features/reader/reader_screen.dart';
import '../../features/library/books_screen.dart';
import '../../features/library/book_detail_screen.dart';
import '../../features/library/chapter_reader_screen.dart';
import '../../features/vocabulary/vocab_dashboard.dart';
import '../../features/vocabulary/flashcard_screen.dart';
import '../../features/chat/chat_screen.dart';
import '../../features/generator/generator_screen.dart';
import '../../features/rust_test/rust_test_screen.dart';

import '../../shared/widgets/scaffold_with_navigation.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateChangesProvider);

  return GoRouter(
    initialLocation: '/library',
    redirect: (context, state) {
      final isLoggedIn = authState.value != null;
      final isLoggingIn = state.uri.path == '/login';

      if (!isLoggedIn && !isLoggingIn) return '/login';
      if (isLoggedIn && isLoggingIn) return '/library';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithNavigation(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/library',
                builder: (context, state) => const LibraryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/books',
                builder: (context, state) => const BooksScreen(),
                routes: [
                  GoRoute(
                    path: ':id', // Nested route for detail
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return BookDetailScreen(bookId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/vocab',
                builder: (context, state) => const VocabDashboard(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/chat',
                builder: (context, state) => const ChatScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/rust_test',
                builder: (context, state) => const RustTestScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/read/:id',
        parentNavigatorKey: null, // Full screen
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ReaderScreen(storyId: id);
        },
      ),
      GoRoute(
        path: '/book/:bookId/read/:chapterIndex',
        parentNavigatorKey: null, // Full screen
        builder: (context, state) {
          final bookId = state.pathParameters['bookId']!;
          final chapterIndex = int.parse(state.pathParameters['chapterIndex']!);
          return ChapterReaderScreen(
              bookId: bookId, chapterIndex: chapterIndex);
        },
      ),
      GoRoute(
        path: '/flashcards',
        parentNavigatorKey: null,
        builder: (context, state) => const FlashcardScreen(),
      ),
      GoRoute(
        path: '/generator',
        parentNavigatorKey: null,
        builder: (context, state) => const GeneratorScreen(),
      ),
    ],
  );
});
