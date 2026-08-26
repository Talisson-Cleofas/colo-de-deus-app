import 'package:colo_de_deus_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('exibe orientação segura quando Firebase não está configurado',
      (tester) async {
    await tester
        .pumpWidget(const ColoDeDeusApp(firebaseError: 'missing-config'));
    expect(find.text('Configuração do Firebase necessária'), findsOneWidget);
    expect(find.byIcon(Icons.settings_applications_outlined), findsOneWidget);
  });

  testWidgets('tela de configuração suporta escala de texto ampliada',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      const MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(2)),
        child: ColoDeDeusApp(firebaseError: 'missing-config'),
      ),
    );
    expect(tester.takeException(), isNull);
    expect(find.text('Configuração do Firebase necessária'), findsOneWidget);
  });
}
