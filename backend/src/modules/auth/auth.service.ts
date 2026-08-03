import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from '../../common/types/jwt-payload';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

type AttemptState = { fails: number; lockedUntil?: number };

@Injectable()
export class AuthService {
  private attempts = new Map<string, AttemptState>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  private assertNotLocked(email: string) {
    const state = this.attempts.get(this.key(email));
    if (!state?.lockedUntil) return;
    const remaining = state.lockedUntil - Date.now();
    if (remaining <= 0) {
      this.attempts.delete(this.key(email));
      return;
    }
    const mins = Math.ceil(remaining / 60000);
    throw new HttpException(
      `Cuenta bloqueada por demasiados intentos fallidos. Probá en ${mins} min.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private fail(email: string): never {
    const k = this.key(email);
    const prev = this.attempts.get(k) ?? { fails: 0 };
    const fails = prev.fails + 1;
    if (fails >= MAX_ATTEMPTS) {
      this.attempts.set(k, { fails, lockedUntil: Date.now() + LOCK_MS });
      throw new HttpException(
        `Cuenta bloqueada por ${MAX_ATTEMPTS} intentos fallidos. Probá en 15 minutos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.attempts.set(k, { fails });
    const left = MAX_ATTEMPTS - fails;
    throw new UnauthorizedException(
      `Credenciales inválidas. Te quedan ${left} intento${left === 1 ? '' : 's'}.`,
    );
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    this.assertNotLocked(email);

    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: { docente: true },
    });

    if (!user || !user.activo) {
      this.fail(email);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.fail(email);
    }

    this.attempts.delete(this.key(email));

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      docenteId: user.docente?.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresInSeconds: 30 * 60,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        docenteId: user.docente?.id,
        nombre: user.docente
          ? `${user.docente.nombre} ${user.docente.apellido}`
          : undefined,
      },
    };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { docente: true },
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }
    return {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      docenteId: user.docente?.id,
    } satisfies JwtPayload;
  }
}
