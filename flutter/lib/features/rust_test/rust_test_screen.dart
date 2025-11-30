import 'package:flutter/material.dart';
import '../../src/bindings/signals/signals.dart';

class RustTestScreen extends StatefulWidget {
  const RustTestScreen({super.key});

  @override
  State<RustTestScreen> createState() => _RustTestScreenState();
}

class _RustTestScreenState extends State<RustTestScreen> {
  String _message = 'Press the button to call Rust';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rust Test'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _message,
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _callRust,
              child: const Text('Call Rust Function'),
            ),
          ],
        ),
      ),
    );
  }

  void _callRust() async {
    // Send request to Rust
    RustHelloRequest().sendSignalToRust();

    // Listen for response
    final receiver = RustHelloResponse.rustSignalStream;
    receiver.listen((signalPack) {
      if (mounted) {
        setState(() {
          _message = signalPack.message.message;
        });
      }
    });
  }
}
