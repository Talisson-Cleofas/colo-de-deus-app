# Aplicativo Flutter — Android e iPhone

## Requisitos
- Flutter 3.24+ / Dart 3.5+
- Android Studio para Android
- macOS + Xcode 16+ para iPhone

## Preparação
```bash
cd mobile
flutter pub get
flutter create . --platforms=android,ios
```
O último comando completa arquivos de plataforma que podem variar conforme a versão instalada do Flutter, preservando `lib/`, `assets/` e `pubspec.yaml`.

## Rodar em modo demonstração
```bash
flutter run --dart-define=DEMO_MODE=true --dart-define=API_URL=http://10.0.2.2:4000/api
```
No simulador iOS use `http://127.0.0.1:4000/api`. Em dispositivo físico, informe o IP local do computador.

## Builds
```bash
flutter build appbundle --release --dart-define=API_URL=https://SUA-API/api --dart-define=DEMO_MODE=false
flutter build ipa --release --dart-define=API_URL=https://SUA-API/api --dart-define=DEMO_MODE=false
```
