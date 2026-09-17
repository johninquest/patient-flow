import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './core/auth/auth.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { PatientsModule } from './modules/patients/patients.module.js';
import { EncountersModule } from './modules/encounters/encounters.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { UserModule } from './modules/user/user.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ClinicalNotesModule } from './modules/clinical-notes/clinical-notes.module.js';
import { ProblemsModule } from './modules/problems/problems.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AuditModule,
    PatientsModule,
    EncountersModule,
    TasksModule,
    UserModule,
    DashboardModule,
    ClinicalNotesModule,
    ProblemsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
