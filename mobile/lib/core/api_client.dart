import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'app_config.dart';
import 'offline_store.dart';

class ApiClient {
  ApiClient(this.store);
  final OfflineStore store;

  Future<dynamic> get(String path, {dynamic fallback}) async {
    final key = path.replaceAll('/', '_');
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) {
      return await store.readJson(key) ?? fallback;
    }
    try {
      final response = await http.get(Uri.parse('${AppConfig.apiUrl}$path')).timeout(const Duration(seconds: 12));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        await store.cacheJson(key, data);
        return data;
      }
    } catch (_) {}
    return await store.readJson(key) ?? fallback;
  }

  Future<void> post(String path, Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.apiUrl}$path'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 12));
      if (response.statusCode < 200 || response.statusCode >= 300) throw Exception('Falha');
    } catch (_) {
      await store.enqueue({'method': 'POST', 'path': path, 'body': body});
    }
  }

  Future<int> sync() async {
    final queue = await store.pending();
    final remaining = <Map<String, dynamic>>[];
    var synced = 0;
    for (final action in queue) {
      try {
        final response = await http.post(
          Uri.parse('${AppConfig.apiUrl}${action['path']}'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(action['body']),
        ).timeout(const Duration(seconds: 12));
        if (response.statusCode < 200 || response.statusCode >= 300) throw Exception('Falha');
        synced++;
      } catch (_) {
        remaining.add(action);
      }
    }
    await store.replaceQueue(remaining);
    return synced;
  }
}
