/// Splits text into tokens (words and punctuation) for interactive rendering.
/// Matches the logic in React's textUtils.js
List<String> tokenize(String text) {
  if (text.isEmpty) return [];

  // Regex to split by spaces and punctuation, keeping delimiters
  // This is a simplified version; for robust German tokenization we might need more complex regex
  // or a specific package, but this should suffice for now.
  // We want to split by whitespace but keep punctuation attached or separate?
  // React logic: text.split(/(\s+|[.,/#!$%^&*;:{}=\-_`~()])/g)

  // In Dart, split with keeping delimiters is manual.
  // We'll use a RegExp to match tokens.

  final RegExp exp = RegExp(r"(\w+|[^\w\s]+|\s+)");
  return exp.allMatches(text).map((m) => m.group(0)!).toList();
}

/// Checks if a token is a valid word (not punctuation or whitespace)
bool isWord(String token) {
  return RegExp(r"\w").hasMatch(token);
}

/// Cleans a token for dictionary lookup (removes punctuation)
String cleanToken(String token) {
  return token.trim().replaceAll(RegExp(r"[.,/#!$%^&*;:{}=\-_`~()]"), "");
}
