import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { TenantModule } from './tenants/tenant.module';
import { RentModule } from './rent/rent.module';
import { ExpensesModule } from './expenses/expenses.module';
import { UserAccessModule } from './user-access/user-access.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
