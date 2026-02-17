import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { UnitsModule } from './modules/units/units.module';
import { TenantModule } from './modules/tenants/tenant.module';
import { RentModule } from './modules/rent/rent.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { UserAccessModule } from './modules/user-access/user-access.module';
import { ActivityModule } from './modules/activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PropertiesModule,
    UnitsModule,
    TenantModule,
    RentModule,
    ExpensesModule,
    UserAccessModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
