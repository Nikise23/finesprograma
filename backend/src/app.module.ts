import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CensModule } from './modules/cens/cens.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { ComisionesModule } from './modules/comisiones/comisiones.module';
import { EstudiantesModule } from './modules/estudiantes/estudiantes.module';
import { DocentesModule } from './modules/docentes/docentes.module';
import { SolicitudesBajaModule } from './modules/solicitudes-baja/solicitudes-baja.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LibrosMatricesModule } from './modules/libros-matrices/libros-matrices.module';
import { NotasModule } from './modules/notas/notas.module';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { PlanificacionesModule } from './modules/planificaciones/planificaciones.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { UsersModule } from './modules/users/users.module';
import { TrayectoriasModule } from './modules/trayectorias/trayectorias.module';
import { ModulosModule } from './modules/modulos/modulos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    CensModule,
    SedesModule,
    ComisionesModule,
    EstudiantesModule,
    DocentesModule,
    SolicitudesBajaModule,
    DashboardModule,
    LibrosMatricesModule,
    NotasModule,
    AsistenciaModule,
    PlanificacionesModule,
    ReportesModule,
    UsersModule,
    TrayectoriasModule,
    ModulosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
