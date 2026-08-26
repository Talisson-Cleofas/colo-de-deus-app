import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;

import 'app_config.dart';
import 'auth_session.dart';
import 'offline_store.dart';

class ApiClient {
  ApiClient(
    this.store, {
    http.Client? httpClient,
    AuthSession? authSession,
    this.baseUrl = AppConfig.apiUrl,
    Future<List<ConnectivityResult>> Function()? connectivity,
  })  : _http = httpClient ?? http.Client(),
        _auth = authSession ?? FirebaseAuthSession(),
        _connectivity = connectivity ?? Connectivity().checkConnectivity;

  final OfflineStore store;
  final http.Client _http;
  final AuthSession _auth;
  final String baseUrl;
  final Future<List<ConnectivityResult>> Function() _connectivity;

  Future<Map<String, String>> _headers({
    bool forceRefresh = false,
    String? idempotencyKey,
  }) async {
    final token = await _auth.idToken(forceRefresh: forceRefresh);
    if (token == null || token.isEmpty) throw const ApiUnauthorizedException();
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
      if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
    };
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Object? body,
    String? idempotencyKey,
    bool forceRefresh = false,
  }) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers.addAll(
        await _headers(
            forceRefresh: forceRefresh, idempotencyKey: idempotencyKey),
      );
    if (body != null) request.body = jsonEncode(body);
    final streamed =
        await _http.send(request).timeout(const Duration(seconds: 12));
    return http.Response.fromStream(streamed);
  }

  Future<http.Response> _authorizedRequest(
    String method,
    String path, {
    Object? body,
    String? idempotencyKey,
  }) async {
    var response =
        await _send(method, path, body: body, idempotencyKey: idempotencyKey);
    if (response.statusCode == 401) {
      response = await _send(
        method,
        path,
        body: body,
        idempotencyKey: idempotencyKey,
        forceRefresh: true,
      );
      if (response.statusCode == 401) {
        final ownerId = _auth.userId;
        if (ownerId != null) await store.clearSensitive(ownerId);
        await _auth.signOut();
        throw const ApiUnauthorizedException();
      }
    }
    if (response.statusCode == 403) throw const ApiForbiddenException();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiRequestException(
        'A API retornou ${response.statusCode}.',
        statusCode: response.statusCode,
      );
    }
    return response;
  }

  Future<dynamic> get(String path, {dynamic fallback}) async {
    final ownerId = _auth.userId;
    if (ownerId == null) throw const ApiUnauthorizedException();
    final key = path.replaceAll('/', '_');
    if ((await _connectivity()).contains(ConnectivityResult.none)) {
      return await store.readJson(ownerId, key) ?? fallback;
    }
    try {
      final response = await _authorizedRequest('GET', path);
      final data = jsonDecode(response.body);
      await store.cacheJson(ownerId, key, data);
      return data;
    } on ApiUnauthorizedException {
      rethrow;
    } on ApiForbiddenException {
      rethrow;
    } on ApiRequestException {
      rethrow;
    } catch (_) {
      return await store.readJson(ownerId, key) ?? fallback;
    }
  }

  Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    bool queueWhenOffline = false,
    String? idempotencyKey,
  }) async {
    final ownerId = _auth.userId;
    if (ownerId == null) throw const ApiUnauthorizedException();
    final operationId = idempotencyKey ?? _newOperationId();
    try {
      final response = await _authorizedRequest(
        'POST',
        path,
        body: body,
        idempotencyKey: operationId,
      );
      return response.body.isEmpty ? null : jsonDecode(response.body);
    } on ApiUnauthorizedException {
      rethrow;
    } on ApiForbiddenException {
      rethrow;
    } on ApiRequestException {
      rethrow;
    } catch (_) {
      if (!queueWhenOffline) rethrow;
      await store.enqueue(ownerId, {
        'method': 'POST',
        'path': path,
        'body': body,
        'idempotencyKey': operationId,
      });
      return null;
    }
  }

  Future<int> sync() async {
    final ownerId = _auth.userId;
    if (ownerId == null) throw const ApiUnauthorizedException();
    final queue = await store.pending(ownerId);
    final remaining = <Map<String, dynamic>>[];
    var synced = 0;
    for (final action in queue.where((item) => item['ownerId'] == ownerId)) {
      try {
        await _authorizedRequest(
          action['method'] as String? ?? 'POST',
          action['path'] as String,
          body: action['body'],
          idempotencyKey: action['idempotencyKey'] as String?,
        );
        synced++;
      } on ApiUnauthorizedException {
        rethrow;
      } on ApiForbiddenException {
        remaining.add(action);
      } catch (_) {
        remaining.add(action);
      }
    }
    await store.replaceQueue(ownerId, remaining);
    return synced;
  }

  Future<void> logout() async {
    final ownerId = _auth.userId;
    if (ownerId != null) await store.clearSensitive(ownerId);
    await _auth.signOut();
  }

  String _newOperationId() {
    final random = Random.secure();
    final suffix = List.generate(
      4,
      (_) => random.nextInt(1 << 32).toRadixString(16),
    ).join();
    return '${DateTime.now().microsecondsSinceEpoch}-$suffix';
  }
}
