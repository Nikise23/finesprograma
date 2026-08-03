import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

function corsOrigins(): string | string[] | boolean {
  const raw = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length <= 1 ? list[0] ?? true : list;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('FINES Adultos API')
    .setDescription('Sistema de gestión académica — Modalidad Adultos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`API: http://localhost:${port}/api`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
