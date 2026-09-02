const test = require('node:test');
const assert = require('node:assert/strict');
const { Reflector } = require('@nestjs/core');
const { RolesGuard } = require('../dist/auth/guards/roles.guard');
const { GoogleDriveController } = require('../dist/google-drive/google-drive.controller');

test('Drive list and detail allow ministry/mission leadership and developer only', () => {
  const guard = new RolesGuard(new Reflector());
  for (const action of ['list', 'get']) {
    for (const profile of ['MINISTRY_LEADER', 'MISSION_LEADER', 'DEVELOPER', 'ADMIN', 'CELL_LEADER', 'MEMBER']) {
      const context = {
        getHandler: () => GoogleDriveController.prototype[action],
        getClass: () => GoogleDriveController,
        switchToHttp: () => ({ getRequest: () => ({ user: { profile } }) }),
      };
      if (['CELL_LEADER', 'MEMBER'].includes(profile)) {
        assert.throws(() => guard.canActivate(context), /permissão/);
      } else {
        assert.equal(guard.canActivate(context), true);
      }
    }
  }
});

test('moving Drive navigation preserves receipt upload access', () => {
  const guard = new RolesGuard(new Reflector());
  const context = {
    getHandler: () => GoogleDriveController.prototype.receipt,
    getClass: () => GoogleDriveController,
    switchToHttp: () => ({ getRequest: () => ({ user: { profile: 'MEMBER' } }) }),
  };
  assert.equal(guard.canActivate(context), true);
});
