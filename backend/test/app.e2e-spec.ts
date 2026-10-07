import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/api/auth/login (POST) valida body', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-es-email', password: 'x' })
      .expect(400);
  });

  it('/api/auth/login (POST) rechaza credenciales inválidas', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'noexiste@fines.gob.ar', password: 'WrongPass1' })
      .expect(401);
  });

  it('/api/auth/login (POST) acepta admin seed', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@fines.gob.ar', password: 'Admin1234' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('admin@fines.gob.ar');
  });

  it(
    '/api/trayectorias/dni/:dni (GET) devuelve ficha con notas históricas',
    async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@fines.gob.ar', password: 'Admin1234' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/trayectorias/dni/14889359')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(res.body.dni).toBe('14889359');
      expect(res.body.apellido).toMatch(/SOSA/i);
      expect(Array.isArray(res.body.informesNotas)).toBe(true);
      expect(res.body.informesNotas.length).toBeGreaterThan(0);
      expect(res.body.informesNotas[0].notas.length).toBeGreaterThan(0);
    },
    60000,
  );

  afterEach(async () => {
    await app.close();
  });
});
