import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZodSerializerInterceptor } from 'nestjs-zod';

import { BullQueueModule } from '@app/common/queue/bull-queue.module';
import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { AllExceptionsFilter } from '@app/common/filters/all-exception.filter';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { LogInterceptor } from '@app/common/interceptors/log.interceptor';
import { AppZodValidationPipe } from '@app/common/pipes/app-zod-validation.pipe';
import { PermissionsGuard } from '@app/common/guards/permissions.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { createTypeOrmOptions } from '@app/database/typeorm.config';
import { AdminModule } from './admin/admin.module';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { DataSourceModule } from './data-source/data-source.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DestinationsModule } from './destinations/destinations.module';
import { GroupsModule } from './groups/groups.module';
import { OrganizationModule } from './organization/organization.module';
import { QueryModule } from './query/query.module';
import { SessionModule } from './session/session.module';
import { SetupModule } from './setup/setup.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { VisualizationModule } from './visualization/visualization.module';
import { VerificationModule } from './verification/verification.module';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullQueueModule.register(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions(configService),
    }),
    HealthModule,
    CurrentUserModule,
    AdminModule,
    AlertsModule,
    AuthModule,
    DataSourceModule,
    DestinationsModule,
    GroupsModule,
    OrganizationModule,
    SessionModule,
    DashboardModule,
    QueryModule,
    VisualizationModule,
    VerificationModule,
    SetupModule,
    SettingsModule,
    UsersModule,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    AllExceptionsFilter,
    {
      provide: APP_PIPE,
      useClass: AppZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useExisting: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionsGuard,
    },
  ],
})
export class AppModule {}
