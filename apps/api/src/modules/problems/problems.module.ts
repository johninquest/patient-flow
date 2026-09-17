import { Module } from '@nestjs/common';
import { ProblemsService } from './problems.service.js';
import { ProblemsController } from './problems.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
  exports: [ProblemsService],
})
export class ProblemsModule {}
