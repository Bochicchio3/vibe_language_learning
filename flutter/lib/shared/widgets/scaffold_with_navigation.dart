import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ScaffoldWithNavigation extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ScaffoldWithNavigation({
    super.key,
    required this.navigationShell,
  });

  void _goBranch(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 800;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
              extended: width >= 1000,
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: _goBranch,
              destinations: const [
                NavigationRailDestination(
                  icon: Icon(Icons.library_books_outlined),
                  selectedIcon: Icon(Icons.library_books),
                  label: Text('Library'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.book_outlined),
                  selectedIcon: Icon(Icons.book),
                  label: Text('Books'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.style_outlined),
                  selectedIcon: Icon(Icons.style),
                  label: Text('Vocab'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.chat_bubble_outline),
                  selectedIcon: Icon(Icons.chat_bubble),
                  label: Text('Chat'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.code_outlined),
                  selectedIcon: Icon(Icons.code),
                  label: Text('Rust Test'),
                ),
              ],
            ),
            const VerticalDivider(thickness: 1, width: 1),
            Expanded(
              child: Container(
                color:
                    isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1200),
                    child: navigationShell,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: _goBranch,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.library_books_outlined),
            selectedIcon: Icon(Icons.library_books),
            label: 'Library',
          ),
          NavigationDestination(
            icon: Icon(Icons.book_outlined),
            selectedIcon: Icon(Icons.book),
            label: 'Books',
          ),
          NavigationDestination(
            icon: Icon(Icons.style_outlined),
            selectedIcon: Icon(Icons.style),
            label: 'Vocab',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.code_outlined),
            selectedIcon: Icon(Icons.code),
            label: 'Rust Test',
          ),
        ],
      ),
    );
  }
}
