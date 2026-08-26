import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'core/api_client.dart';
import 'core/auth_service.dart';
import 'core/auth_session.dart';
import 'core/offline_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Object? firebaseError;
  try {
    await Firebase.initializeApp();
  } catch (error) {
    firebaseError = error;
  }
  runApp(ColoDeDeusApp(firebaseError: firebaseError));
}

class ColoDeDeusApp extends StatelessWidget {
  const ColoDeDeusApp({super.key, this.firebaseError, this.home});

  final Object? firebaseError;
  final Widget? home;

  @override
  Widget build(BuildContext context) {
    const bronze = Color(0xFFB98655);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Colo de Deus',
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
            seedColor: bronze, brightness: Brightness.dark),
        scaffoldBackgroundColor: const Color(0xFF050505),
        cardTheme: const CardThemeData(color: Color(0xFF111111), elevation: 0),
        navigationBarTheme:
            const NavigationBarThemeData(backgroundColor: Color(0xFF0B0B0B)),
      ),
      home: home ??
          (firebaseError == null
              ? const AuthGate()
              : const FirebaseConfigurationPage()),
    );
  }
}

class FirebaseConfigurationPage extends StatelessWidget {
  const FirebaseConfigurationPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Semantics(
                liveRegion: true,
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.settings_applications_outlined, size: 48),
                    SizedBox(height: 16),
                    Text(
                      'Configuração do Firebase necessária',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Adicione a configuração Android autorizada antes de autenticar. Nenhuma credencial foi criada ou substituída.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AuthService();
    return StreamBuilder<User?>(
      stream: auth.authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const _LoadingPage(message: 'Validando sua sessão…');
        }
        if (snapshot.data == null) return LoginPage(authService: auth);
        return HomeShell(client: ApiClient(OfflineStore()), authService: auth);
      },
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.authService});
  final AuthService authService;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool loading = false;
  String error = '';

  Future<void> login() async {
    setState(() {
      loading = true;
      error = '';
    });
    try {
      await widget.authService.signInWithGoogle();
    } catch (_) {
      if (mounted) {
        setState(() => error =
            'Não foi possível entrar. Verifique sua conexão e tente novamente.');
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  children: [
                    Image.asset(
                      'assets/images/logo-oficial-branca.png',
                      width: 96,
                      height: 96,
                      semanticLabel: 'Colo de Deus — Missão Brasília',
                    ),
                    const SizedBox(height: 24),
                    const Text('Bem-vindo',
                        style: TextStyle(
                            fontSize: 28, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    const Text('Entre com sua conta Google autorizada.',
                        textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    Semantics(
                      liveRegion: true,
                      child: Text(error,
                          style: const TextStyle(color: Colors.redAccent)),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton.icon(
                        onPressed: loading ? null : login,
                        icon: loading
                            ? const SizedBox.square(
                                dimension: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.login),
                        label:
                            Text(loading ? 'Entrando…' : 'Entrar com Google'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class _LoadingPage extends StatelessWidget {
  const _LoadingPage({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Semantics(
            liveRegion: true,
            label: message,
            child: const CircularProgressIndicator(),
          ),
        ),
      );
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.client, this.authService});
  final ApiClient client;
  final AuthService? authService;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardTab(client: widget.client),
      DirectoryTab(client: widget.client),
      LectioTab(client: widget.client),
      AgendaTab(client: widget.client),
      MoreTab(client: widget.client, authService: widget.authService),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/images/logo-oficial-branca.png',
              width: 38,
              height: 38,
              semanticLabel: 'Colo de Deus',
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Colo de Deus',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                Text('Missão Brasília',
                    style: TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sincronizar dados',
            onPressed: () async {
              try {
                final count = await widget.client.sync();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('$count registro(s) sincronizado(s).')),
                  );
                }
              } on ApiForbiddenException catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(error.message)));
                }
              }
            },
            icon: const Icon(Icons.sync),
          ),
        ],
      ),
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Início'),
          NavigationDestination(
              icon: Icon(Icons.groups_outlined),
              selectedIcon: Icon(Icons.groups),
              label: 'Membros'),
          NavigationDestination(
              icon: Icon(Icons.menu_book_outlined),
              selectedIcon: Icon(Icons.menu_book),
              label: 'Lectio'),
          NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month),
              label: 'Agenda'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'Mais'),
        ],
      ),
    );
  }
}

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key, required this.client});
  final ApiClient client;

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
        future: client
            .get('/members/me/profile', fallback: const <String, dynamic>{}),
        builder: (context, snapshot) {
          final envelope =
              snapshot.data is Map ? snapshot.data as Map : const {};
          final member =
              envelope['member'] is Map ? envelope['member'] as Map : const {};
          final name = member['name'] ?? member['nome'] ?? 'Membro';
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Olá, $name!',
                  style: const TextStyle(
                      fontSize: 28, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('Que bom ter você aqui.'),
              if (snapshot.hasError) ...[
                const SizedBox(height: 16),
                _ErrorCard(error: snapshot.error),
              ],
            ],
          );
        },
      );
}

class DirectoryTab extends StatelessWidget {
  const DirectoryTab({super.key, required this.client});
  final ApiClient client;

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
        future:
            client.get('/members', fallback: const {'members': <dynamic>[]}),
        builder: (context, snapshot) {
          final data = snapshot.data;
          final members = data is Map && data['members'] is List
              ? data['members'] as List
              : const [];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Membros',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
              if (snapshot.hasError) _ErrorCard(error: snapshot.error),
              ...members.map((item) {
                final member = item as Map;
                final name = '${member['name'] ?? member['nome'] ?? 'Membro'}';
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(child: Text(name.characters.first)),
                    title: Text(name),
                    subtitle: Text(
                        '${member['ministry'] ?? ''} ${member['cell'] ?? ''}'
                            .trim()),
                  ),
                );
              }),
            ],
          );
        },
      );
}

class LectioTab extends StatelessWidget {
  const LectioTab({super.key, required this.client});
  final ApiClient client;

  @override
  Widget build(BuildContext context) => _RemoteListPage(
        title: 'Lectio Divina',
        future:
            client.get('/lectio/today', fallback: const <String, dynamic>{}),
        itemBuilder: (data) {
          final item = data is Map ? data : const {};
          return [
            _TextCard(
                title: '${item['title'] ?? item['titulo'] ?? 'Lectio de hoje'}',
                text:
                    '${item['content'] ?? item['conteudo'] ?? 'Conteúdo indisponível offline.'}'),
          ];
        },
      );
}

class AgendaTab extends StatelessWidget {
  const AgendaTab({super.key, required this.client});
  final ApiClient client;

  @override
  Widget build(BuildContext context) => _RemoteListPage(
        title: 'Agenda',
        future: client.get('/events', fallback: const <dynamic>[]),
        itemBuilder: (data) {
          final events = data is List ? data : const [];
          return events.map((item) {
            final event = item as Map;
            return Card(
              child: ListTile(
                leading: const Icon(Icons.event_outlined),
                title: Text(
                    '${event['title'] ?? event['name'] ?? event['nome'] ?? 'Evento'}'),
                subtitle:
                    Text('${event['startDate'] ?? event['data_inicio'] ?? ''}'),
              ),
            );
          }).toList();
        },
      );
}

class MoreTab extends StatelessWidget {
  const MoreTab({super.key, required this.client, this.authService});
  final ApiClient client;
  final AuthService? authService;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Mais',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          FutureBuilder<dynamic>(
            future: client.get('/notifications/state',
                fallback: const {'unreadCount': 0}),
            builder: (context, snapshot) => Card(
              child: ListTile(
                leading: const Icon(Icons.notifications_outlined),
                title: const Text('Notificações'),
                subtitle: Text(
                    '${snapshot.data is Map ? snapshot.data['unreadCount'] ?? 0 : 0} não lida(s)'),
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sair'),
              onTap: () async {
                await client.logout();
                await authService?.signOut();
              },
            ),
          ),
        ],
      );
}

class _RemoteListPage extends StatelessWidget {
  const _RemoteListPage(
      {required this.title, required this.future, required this.itemBuilder});
  final String title;
  final Future<dynamic> future;
  final List<Widget> Function(dynamic data) itemBuilder;

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
        future: future,
        builder: (context, snapshot) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            if (snapshot.connectionState == ConnectionState.waiting)
              Semantics(liveRegion: true, child: LinearProgressIndicator()),
            if (snapshot.hasError) _ErrorCard(error: snapshot.error),
            if (snapshot.hasData) ...itemBuilder(snapshot.data),
          ],
        ),
      );
}

class _TextCard extends StatelessWidget {
  const _TextCard({required this.title, required this.text});
  final String title;
  final String text;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(text),
            ],
          ),
        ),
      );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.error});
  final Object? error;

  @override
  Widget build(BuildContext context) {
    final message = error is ApiForbiddenException
        ? (error as ApiForbiddenException).message
        : error is ApiUnauthorizedException
            ? (error as ApiUnauthorizedException).message
            : 'Não foi possível carregar os dados.';
    return Semantics(
      liveRegion: true,
      child: Card(
        color: Theme.of(context).colorScheme.errorContainer,
        child: ListTile(
            leading: const Icon(Icons.error_outline), title: Text(message)),
      ),
    );
  }
}
