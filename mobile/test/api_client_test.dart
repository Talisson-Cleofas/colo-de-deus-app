import 'dart:convert';

import 'package:colo_de_deus_mobile/core/api_client.dart';
import 'package:colo_de_deus_mobile/core/auth_session.dart';
import 'package:colo_de_deus_mobile/core/offline_store.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeAuthSession implements AuthSession {
  FakeAuthSession(
      {this.userId = 'user-1',
      this.token = 'token-1',
      this.refreshedToken = 'token-2'});
  @override
  String? userId;
  String? token;
  String? refreshedToken;
  bool signedOut = false;
  final forceRefreshCalls = <bool>[];

  @override
  Future<String?> idToken({bool forceRefresh = false}) async {
    forceRefreshCalls.add(forceRefresh);
    return forceRefresh ? refreshedToken : token;
  }

  @override
  Future<void> signOut() async => signedOut = true;
}

ApiClient clientFor(FakeAuthSession auth, MockClient httpClient) => ApiClient(
      OfflineStore(),
      authSession: auth,
      httpClient: httpClient,
      baseUrl: 'https://api.example.test/api',
      connectivity: () async => [ConnectivityResult.wifi],
    );

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('adiciona Firebase ID token como Bearer', () async {
    final auth = FakeAuthSession();
    late String? authorization;
    final client = clientFor(auth, MockClient((request) async {
      authorization = request.headers['authorization'];
      return http.Response('{}', 200);
    }));
    await client.get('/auth/me');
    expect(authorization, 'Bearer token-1');
    expect(auth.forceRefreshCalls, [false]);
  });

  test('renova token uma vez após 401 e usa o token novo', () async {
    final auth = FakeAuthSession();
    final headers = <String?>[];
    final client = clientFor(auth, MockClient((request) async {
      headers.add(request.headers['authorization']);
      return http.Response('{}', headers.length == 1 ? 401 : 200);
    }));
    await client.get('/auth/me');
    expect(headers, ['Bearer token-1', 'Bearer token-2']);
    expect(auth.forceRefreshCalls, [false, true]);
    expect(auth.signedOut, isFalse);
  });

  test('chamada sem usuário autenticado é rejeitada', () async {
    final auth = FakeAuthSession(userId: null, token: null);
    final client =
        clientFor(auth, MockClient((_) async => http.Response('{}', 200)));
    await expectLater(
        client.get('/auth/me'), throwsA(isA<ApiUnauthorizedException>()));
    expect(auth.signedOut, isFalse);
  });

  test('segundo 401 encerra sessão e limpa dados sensíveis', () async {
    SharedPreferences.setMockInitialValues({
      'cache:user-1:_auth_me': jsonEncode({'secret': true}),
      'offline:queue:user-1': jsonEncode(<dynamic>[]),
    });
    final auth = FakeAuthSession();
    final client =
        clientFor(auth, MockClient((_) async => http.Response('{}', 401)));
    await expectLater(
        client.get('/auth/me'), throwsA(isA<ApiUnauthorizedException>()));
    expect(auth.signedOut, isTrue);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getKeys().where((key) => key.contains('user-1')), isEmpty);
  });

  test('403 preserva a sessão e informa falta de permissão', () async {
    final auth = FakeAuthSession();
    final client =
        clientFor(auth, MockClient((_) async => http.Response('{}', 403)));
    await expectLater(
        client.get('/admin'), throwsA(isA<ApiForbiddenException>()));
    expect(auth.signedOut, isFalse);
    expect(auth.forceRefreshCalls, [false]);
  });

  test('POST usa Idempotency-Key novo', () async {
    final auth = FakeAuthSession();
    late String? key;
    final client = clientFor(auth, MockClient((request) async {
      key = request.headers['idempotency-key'];
      return http.Response('{}', 200);
    }));
    await client.post('/missionary-agenda/id/complete', const {});
    expect(key, isNotEmpty);
  });

  test('logout limpa armazenamento do usuário e encerra Firebase', () async {
    SharedPreferences.setMockInitialValues({
      'cache:user-1:_profile': '{}',
      'offline:queue:user-1': '[]',
    });
    final auth = FakeAuthSession();
    final client =
        clientFor(auth, MockClient((_) async => http.Response('{}', 200)));
    await client.logout();
    expect(auth.signedOut, isTrue);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getKeys().where((key) => key.contains('user-1')), isEmpty);
  });
}
