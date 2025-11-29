import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../../../core/utils/text_utils.dart';

class InteractiveText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Function(String word) onWordTap;
  final int? highlightedTokenIndex;

  const InteractiveText({
    super.key,
    required this.text,
    this.style,
    required this.onWordTap,
    this.highlightedTokenIndex,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = tokenize(text);
    final defaultStyle = style ?? Theme.of(context).textTheme.bodyLarge;

    return RichText(
      text: TextSpan(
        style: defaultStyle,
        children: tokens.asMap().entries.map((entry) {
          final index = entry.key;
          final token = entry.value;

          if (!isWord(token)) {
            return TextSpan(text: token);
          }

          final clean = cleanToken(token);
          final isHighlighted = index == highlightedTokenIndex;

          return TextSpan(
            text: token,
            style: isHighlighted
                ? defaultStyle?.copyWith(
                    backgroundColor: Colors.amber.withOpacity(0.3),
                    decoration: TextDecoration.underline,
                  )
                : null,
            recognizer: TapGestureRecognizer()..onTap = () => onWordTap(clean),
            mouseCursor: SystemMouseCursors.click,
          );
        }).toList(),
      ),
    );
  }
}
