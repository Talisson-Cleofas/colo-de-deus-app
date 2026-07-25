import 'package:flutter_test/flutter_test.dart';
import 'package:colo_de_deus_mobile/main.dart';
void main() { testWidgets('abre o app', (tester) async { await tester.pumpWidget(const ColoDeDeusApp()); expect(find.text('Colo de Deus'), findsOneWidget); }); }
