import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineStore {
  static const _cachePrefix = 'cache:';
  static const _queuePrefix = 'offline:queue:';

  Future<void> cacheJson(String ownerId, String key, Object value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_cachePrefix$ownerId:$key', jsonEncode(value));
  }

  Future<dynamic> readJson(String ownerId, String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_cachePrefix$ownerId:$key');
    return raw == null ? null : jsonDecode(raw);
  }

  Future<void> enqueue(String ownerId, Map<String, dynamic> action) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await pending(ownerId);
    queue.add({
      ...action,
      'ownerId': ownerId,
      'createdAt': DateTime.now().toIso8601String()
    });
    await prefs.setString('$_queuePrefix$ownerId', jsonEncode(queue));
  }

  Future<List<Map<String, dynamic>>> pending(String ownerId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_queuePrefix$ownerId');
    if (raw == null) return [];
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  Future<void> replaceQueue(
      String ownerId, List<Map<String, dynamic>> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_queuePrefix$ownerId', jsonEncode(queue));
  }

  Future<void> clearSensitive(String ownerId) async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where(
          (key) =>
              key == '$_queuePrefix$ownerId' ||
              key.startsWith('$_cachePrefix$ownerId:'),
        );
    for (final key in keys.toList()) {
      await prefs.remove(key);
    }
  }
}
