# Android e Google Play

1. Instale Flutter e Android Studio.
2. Em `mobile`, execute `flutter pub get` e `flutter create . --platforms=android,ios`.
3. Configure Firebase Android e coloque `google-services.json` em `mobile/android/app/`.
4. Troque `org.colodedeus.missaobrasilia` caso necessário.
5. Crie uma keystore e configure assinatura de release.
6. Gere o pacote:
```bash
flutter build appbundle --release --dart-define=API_URL=https://sua-api.com/api --dart-define=DEMO_MODE=false
```
7. Envie `build/app/outputs/bundle/release/app-release.aab` no Google Play Console.

Antes da produção, remova `android:usesCleartextTraffic="true"` e use somente HTTPS.
