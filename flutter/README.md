# Vibe Language Learning - Flutter App

This directory contains the Flutter implementation of the Vibe Language Learning frontend.

## Setup Instructions

Since this project was generated without the Flutter CLI environment, you need to perform a few initial setup steps to generate the platform-specific files (Android, iOS, MacOS, etc.).

### 1. Initialize Platform Files

Run the following command in this directory to generate the `android`, `ios`, `macos`, `web`, `linux`, and `windows` folders:

```bash
flutter create .
```

This will respect the existing `lib` and `pubspec.yaml` files.

### 2. Install Dependencies

```bash
flutter pub get
```

### 3. Configure Firebase

This app uses Firebase for Authentication and Firestore. You need to configure it for your project.

1.  Install the Firebase CLI if you haven't already.
2.  Run FlutterFire configuration:

```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

3.  Uncomment the Firebase initialization code in `lib/main.dart`:

```dart
// import 'firebase_options.dart'; 

// ...

// await Firebase.initializeApp(
//   options: DefaultFirebaseOptions.currentPlatform,
// );
```

### 4. Run the App

```bash
flutter run
```

## Architecture

-   **State Management**: Riverpod
-   **Routing**: GoRouter
-   **Theme**: Material 3 with Google Fonts (Inter)
-   **Structure**: Feature-first (`lib/features/`)

## Using Rust Inside Flutter

This project leverages Flutter for GUI and Rust for the backend logic,
utilizing the capabilities of the
[Rinf](https://pub.dev/packages/rinf) framework.

To run and build this app, you need to have
[Flutter SDK](https://docs.flutter.dev/get-started/install)
and [Rust toolchain](https://www.rust-lang.org/tools/install)
installed on your system.
You can check that your system is ready with the commands below.
Note that all the Flutter subcomponents should be installed.

```shell
rustc --version
flutter doctor
```

You also need to have the CLI tool for Rinf ready.

```shell
cargo install rinf_cli
```

Signals sent between Dart and Rust are implemented using signal attributes.
If you've modified the signal structs, run the following command
to generate the corresponding Dart classes:

```shell
rinf gen
```

Now you can run and build this app just like any other Flutter projects.

```shell
flutter run
```

For detailed instructions on writing Rust and Flutter together,
please refer to Rinf's [documentation](https://rinf.cunarist.com).
