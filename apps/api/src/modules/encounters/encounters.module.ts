import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service.js';
import { EncountersController } from './encounters.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [EncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
