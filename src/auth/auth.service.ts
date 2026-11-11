import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AdminUser } from './entities/admin-user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ access_token: string; user: Partial<AdminUser> }> {
    const user = await this.adminRepo.findOne({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, password_hash: true },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    const valid = await argon2.verify(user.password_hash, dto.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas.');

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async me(user: AdminUser): Promise<Partial<AdminUser>> {
    return { id: user.id, name: user.name, email: user.email };
  }
}
