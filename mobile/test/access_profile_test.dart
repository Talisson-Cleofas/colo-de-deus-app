import 'package:colo_de_deus_mobile/core/access_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normaliza os quatro perfis globais atuais', () {
    expect(AccessProfile.fromBackend('DEVELOPER'), AccessProfile.developer);
    expect(AccessProfile.fromBackend('MISSION_LEADER'),
        AccessProfile.missionLeader);
    expect(AccessProfile.fromBackend('MINISTRY_LEADER'),
        AccessProfile.ministryLeader);
    expect(AccessProfile.fromBackend('MEMBER'), AccessProfile.member);
  });

  test('aceita aliases legados sem criar novos perfis', () {
    expect(AccessProfile.fromBackend('ADMIN'), AccessProfile.missionLeader);
    expect(AccessProfile.fromBackend('MEMBRO'), AccessProfile.member);
    expect(AccessProfile.fromBackend('CELL_LEADER'),
        AccessProfile.cellLeaderLegacy);
  });

  test('membro não recebe acesso administrativo', () {
    expect(AccessProfile.member.canSeeAdministration, isFalse);
    expect(AccessProfile.ministryLeader.canSeeAdministration, isFalse);
    expect(AccessProfile.missionLeader.canSeeAdministration, isTrue);
    expect(AccessProfile.developer.canSeeAdministration, isTrue);
  });
}
