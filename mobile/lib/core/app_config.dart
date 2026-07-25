class AppConfig {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:4000/api',
  );
  static const demoMode = bool.fromEnvironment('DEMO_MODE', defaultValue: true);
}
