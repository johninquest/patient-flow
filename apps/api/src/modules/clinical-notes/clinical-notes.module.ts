import { Module } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service.js';
import { ClinicalNotesController } from './clinical-notes.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
  exports: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
