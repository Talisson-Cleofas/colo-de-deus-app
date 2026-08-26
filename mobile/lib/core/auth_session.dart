import 'package:firebase_auth/firebase_auth.dart';

abstract interface class AuthSession {
  String? get userId;
  Future<String?> idToken({bool forceRefresh = false});
  Future<void> signOut();
}

class FirebaseAuthSession implements AuthSession {
  FirebaseAuthSession({FirebaseAuth? auth})
      : _auth = auth ?? FirebaseAuth.instance;
  final FirebaseAuth _auth;

  @override
  String? get userId => _auth.currentUser?.uid;

  @override
  Future<String?> idToken({bool forceRefresh = false}) async =>
      await _auth.currentUser?.getIdToken(forceRefresh);

  @override
  Future<void> signOut() => _auth.signOut();
}

class ApiUnauthorizedException implements Exception {
  const ApiUnauthorizedException(
      [this.message = 'Sua sessão expirou. Entre novamente.']);
  final String message;
  @override
  String toString() => message;
}

class ApiForbiddenException implements Exception {
  const ApiForbiddenException(
      [this.message = 'Você não tem permissão para esta ação.']);
  final String message;
  @override
  String toString() => message;
}

class ApiRequestException implements Exception {
  const ApiRequestException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}
