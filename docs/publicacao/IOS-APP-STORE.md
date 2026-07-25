# iPhone e App Store

Requer macOS, Xcode e conta Apple Developer.

1. Execute `flutter create . --platforms=android,ios` dentro de `mobile`.
2. Abra `ios/Runner.xcworkspace` no Xcode.
3. Defina Bundle Identifier, Team e assinatura.
4. Configure Firebase iOS e adicione `GoogleService-Info.plist` ao Runner.
5. Gere:
```bash
flutter build ipa --release --dart-define=API_URL=https://sua-api.com/api --dart-define=DEMO_MODE=false
```
6. Envie pelo Xcode Organizer ou Transporter.
7. Complete privacidade, capturas, classificação e revisão no App Store Connect.
