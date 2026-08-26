# Aplicativo Flutter — Android e iPhone

## Requisitos
- Flutter 3.41.9 / Dart 3.11+
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

`10.0.2.2` só representa a máquina host no emulador Android. Para homologação e produção,
forneça a URL HTTPS centralizada por `--dart-define=API_URL=...`; não altere o código-fonte.

## Firebase e autenticação

O app usa a configuração nativa do projeto Firebase autorizado. No Android, o arquivo
`android/app/google-services.json` deve ser fornecido pelo responsável do ambiente e não é
criado, substituído ou documentado neste repositório. Sem ele, o app exibe uma mensagem de
configuração pendente e não tenta autenticar.

O Google Services Gradle plugin é aplicado somente quando esse arquivo existe. Para homologar,
confirme antes que o cliente Android do arquivo usa o application ID
`org.colodedeus.missaobrasilia` e gere o APK com a URL HTTPS isolada do ambiente:

```bash
flutter build apk --release --dart-define=API_URL=https://SUA-API-DE-HOMOLOGACAO/api --dart-define=DEMO_MODE=false
```

Cada chamada protegida segue `FirebaseAuth.currentUser → getIdToken → Authorization: Bearer`.
Em 401, o token é renovado uma vez; uma segunda resposta 401 encerra a sessão e limpa cache e
fila do usuário. Respostas 403 preservam a sessão e exibem falta de permissão.

## Builds
```bash
flutter build appbundle --release --dart-define=API_URL=https://SUA-API/api --dart-define=DEMO_MODE=false
flutter build ipa --release --dart-define=API_URL=https://SUA-API/api --dart-define=DEMO_MODE=false
```

## Assinatura Android de release

O repositório não contém keystore nem senhas. Quando a chave de upload for criada e guardada
em local seguro, copie `android/key.properties.example` para `android/key.properties` e preencha
somente na máquina/CI autorizada. `key.properties`, `*.jks` e `*.keystore` são ignorados pelo Git.
Sem esse arquivo, builds locais continuam possíveis para diagnóstico, mas não devem ser tratados
como artefatos assinados para publicação.
