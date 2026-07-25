import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineStore {
  static const _cachePrefix = 'cache:';
  static const _queueKey = 'offline:queue';

  Future<void> cacheJson(String key, Object value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_cachePrefix$key', jsonEncode(value));
  }

  Future<dynamic> readJson(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_cachePrefix$key');
    return raw == null ? null : jsonDecode(raw);
  }

  Future<void> enqueue(Map<String, dynamic> action) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await pending();
    queue.add({...action, 'createdAt': DateTime.now().toIso8601String()});
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  Future<List<Map<String, dynamic>>> pending() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null) return [];
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  Future<void> replaceQueue(List<Map<String, dynamic>> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_queueKey, jsonEncode(queue));
  }
}
