import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';

@Module({ imports:[GoogleModule], controllers:[MinistriesController], providers:[MinistriesService] })
export class MinistriesModule {}
