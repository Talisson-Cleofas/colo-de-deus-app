enum AccessProfile {
  developer('DEVELOPER'),
  missionLeader('MISSION_LEADER'),
  ministryLeader('MINISTRY_LEADER'),
  member('MEMBER'),
  cellLeaderLegacy('CELL_LEADER');

  const AccessProfile(this.code);
  final String code;

  static AccessProfile fromBackend(String? value) {
    final normalized = (value ?? '').trim().toUpperCase();
    return switch (normalized) {
      'DEVELOPER' || 'DESENVOLVEDOR' => developer,
      'MISSION_LEADER' || 'LIDER_MISSAO' || 'ADMIN' => missionLeader,
      'MINISTRY_LEADER' || 'LIDER_MINISTERIO' => ministryLeader,
      'CELL_LEADER' => cellLeaderLegacy,
      _ => member,
    };
  }

  bool get canSeeAdministration => this == developer || this == missionLeader;
}
