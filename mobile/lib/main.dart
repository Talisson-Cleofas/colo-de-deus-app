import 'package:flutter/material.dart';
import 'core/api_client.dart';
import 'core/offline_store.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ColoDeDeusApp());
}

class ColoDeDeusApp extends StatelessWidget {
  const ColoDeDeusApp({super.key});

  @override
  Widget build(BuildContext context) {
    const bronze = Color(0xFF9B6B3E);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Colo de Deus',
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: bronze, brightness: Brightness.dark),
        scaffoldBackgroundColor: const Color(0xFF050505),
        cardTheme: const CardThemeData(color: Color(0xFF111111), elevation: 0),
        navigationBarTheme: const NavigationBarThemeData(backgroundColor: Color(0xFF0B0B0B)),
      ),
      home: const HomeShell(),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  final client = ApiClient(OfflineStore());

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardTab(client: client),
      DirectoryTab(client: client),
      const LectioTab(),
      const AgendaTab(),
      MoreTab(client: client),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          ClipOval(child: Image.asset('assets/images/logo-oficial-branca.png', width: 38, height: 38, fit: BoxFit.cover)),
          const SizedBox(width: 12),
          const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Colo de Deus', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text('Missão Brasília', style: TextStyle(fontSize: 11, color: Colors.white60)),
          ]),
        ]),
        actions: [IconButton(onPressed: () async {
          final count = await client.sync();
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$count registro(s) sincronizado(s).')));
        }, icon: const Icon(Icons.sync))],
      ),
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Início'),
          NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups), label: 'Membros'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: 'Lectio'),
          NavigationDestination(icon: Icon(Icons.calendar_month_outlined), selectedIcon: Icon(Icons.calendar_month), label: 'Agenda'),
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
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Olá! 🙏', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      const Text('Que bom ter você aqui.', style: TextStyle(color: Colors.white60)),
      const SizedBox(height: 18),
      Row(children: [ClipOval(child: Image.asset('assets/images/logo-oficial-branca.png', width: 82, height: 82, fit: BoxFit.cover)), const SizedBox(width: 16), const Expanded(child: Text('Anunciar o Amor que Transforma', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)))]),
    ])),
    const SizedBox(height: 12),
    const _ShortcutGrid(),
    const SizedBox(height: 12),
    const Card(child: ListTile(leading: Icon(Icons.wifi_off), title: Text('Modo offline ativo'), subtitle: Text('As telas visitadas ficam disponíveis e os registros são sincronizados depois.'))),
  ]);
}

class _ShortcutGrid extends StatelessWidget {
  const _ShortcutGrid();
  @override
  Widget build(BuildContext context) {
    const data = [(Icons.favorite_outline, 'Soma+'), (Icons.groups_outlined, 'Cenáculos'), (Icons.people_outline, 'Células'), (Icons.folder_outlined, 'Drive')];
    return GridView.count(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), crossAxisCount: 2, childAspectRatio: 1.8, mainAxisSpacing: 10, crossAxisSpacing: 10, children: data.map((item) => Card(child: InkWell(borderRadius: BorderRadius.circular(12), onTap: () {}, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(item.$1), const SizedBox(height: 6), Text(item.$2, style: const TextStyle(fontWeight: FontWeight.w700))]))))).toList());
  }
}

class DirectoryTab extends StatelessWidget {
  const DirectoryTab({super.key, required this.client});
  final ApiClient client;
  @override
  Widget build(BuildContext context) => FutureBuilder(
    future: client.get('/members', fallback: const [
      {'name': 'Talisson Cleofas', 'ministry': 'Coordenação', 'cell': 'Célula Ágape'},
      {'name': 'Maria Oliveira', 'ministry': 'Intercessão', 'cell': 'Célula São José'},
    ]),
    builder: (context, snapshot) {
      final members = (snapshot.data as List? ?? const []);
      return ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Membros', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...members.map((item) => Card(child: ListTile(leading: CircleAvatar(child: Text((item['name'] as String).substring(0, 1))), title: Text(item['name'] ?? ''), subtitle: Text('${item['ministry'] ?? ''} • ${item['cell'] ?? ''}')))),
      ]);
    },
  );
}

class LectioTab extends StatelessWidget {
  const LectioTab({super.key});
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: const [
    Text('Lectio Divina', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)), SizedBox(height: 12),
    Card(child: Padding(padding: EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('“Permanecei no meu amor.”', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)), SizedBox(height: 6), Text('João 15,9', style: TextStyle(color: Colors.white60))]))),
    _Step(title: 'Lectio', text: 'Leia lentamente o texto e perceba as palavras que mais chamam sua atenção.'),
    _Step(title: 'Meditatio', text: 'O que Deus está falando à sua vida por meio desta Palavra?'),
    _Step(title: 'Oratio', text: 'Converse com Deus a partir daquilo que você ouviu.'),
    _Step(title: 'Contemplatio', text: 'Permaneça em silêncio diante da presença de Deus.'),
  ]);
}

class _Step extends StatelessWidget { const _Step({required this.title, required this.text}); final String title; final String text; @override Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFB98655))), const SizedBox(height: 8), Text(text)]))); }

class AgendaTab extends StatelessWidget {
  const AgendaTab({super.key});
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: const [
    Text('Agenda', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)), SizedBox(height: 12),
    _Event(day: '19 JUL', title: 'Retiro de Oração', subtitle: 'Sábado • 08:00'),
    _Event(day: '23 JUL', title: 'Noite de Adoração', subtitle: 'Quarta-feira • 19:30'),
    _Event(day: '27 JUL', title: 'Formação de Líderes', subtitle: 'Domingo • 09:00'),
  ]);
}
class _Event extends StatelessWidget { const _Event({required this.day, required this.title, required this.subtitle}); final String day,title,subtitle; @override Widget build(BuildContext context) => Card(child: ListTile(leading: Text(day, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFB98655))), title: Text(title), subtitle: Text(subtitle))); }

class MoreTab extends StatelessWidget {
  const MoreTab({super.key, required this.client});
  final ApiClient client;
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('Mais', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)), const SizedBox(height: 12),
    for (final item in const [(Icons.favorite_outline,'Soma+'),(Icons.people_outline,'Células e Cenáculos'),(Icons.map_outlined,'Mapa das células'),(Icons.folder_outlined,'Google Drive'),(Icons.bar_chart_outlined,'Relatórios')]) Card(child: ListTile(leading: Icon(item.$1), title: Text(item.$2), trailing: const Icon(Icons.chevron_right))),
    Card(child: ListTile(leading: const Icon(Icons.cloud_upload_outlined), title: const Text('Sincronizar agora'), onTap: () async { final count=await client.sync(); if(context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$count registro(s) sincronizado(s).'))); })),
  ]);
}
