import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { SettingsService } from './settings.service';
import { UpdateGeneralSettingsDto } from './update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('public')
  getPublic() { return this.service.getPublic(); }

  @Get()
  @Roles('ADMIN')
  get() { return this.service.get(); }

  @Patch()
  @Roles('ADMIN')
  update(@Body() dto: UpdateGeneralSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(dto, user);
  }
}
