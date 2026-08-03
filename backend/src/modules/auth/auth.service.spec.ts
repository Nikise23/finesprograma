import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('token-test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('rechaza credenciales inválidas', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@test.com', password: '12345678' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login exitoso devuelve token', async () => {
    const hash = await bcrypt.hash('Admin1234', 10);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: '1',
      email: 'admin@fines.gob.ar',
      passwordHash: hash,
      activo: true,
      rol: 'ADMIN',
      docente: null,
    });

    const result = await service.login({
      email: 'admin@fines.gob.ar',
      password: 'Admin1234',
    });

    expect(result.accessToken).toBe('token-test');
    expect(result.user.rol).toBe('ADMIN');
  });
});
