import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ACCESS_TOKEN_COOKIE_NAME } from '@app/common/auth/auth.constants';
import { CurrentUserService } from '@app/common/current-user/current-user.service';
import {
  hashPassword,
  isLegacyPasswordHash,
  verifyPasswordHash,
} from '@app/common/utils/password.util';
import type { LoginDto } from '../dto/login.schema';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly currentUserService: CurrentUserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const hasAnyOrganization = await this.authRepository.hasAnyOrganization();

    if (!hasAnyOrganization) {
      throw new ConflictException('초기 설정이 필요합니다.');
    }

    const user = await this.authRepository.findActiveUserByEmail(
      payload.email,
      payload.orgSlug,
    );

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('email or password is not valid');
    }

    const isPasswordValid = await verifyPasswordHash(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('email or password is not valid');
    }

    const updateData: {
      passwordHash?: string;
      details?: Record<string, unknown>;
    } = {
      details: {
        ...(user.details ?? {}),
        active_at: new Date().toISOString(),
      },
    };

    if (isLegacyPasswordHash(user.passwordHash)) {
      updateData.passwordHash = await hashPassword(payload.password);
    }

    await this.authRepository.updateUserLoginInfo(user.id, updateData);

    const authenticatedUser =
      await this.currentUserService.getAuthenticatedUserById(user.id);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: this.getAccessTokenExpiresIn(),
      user: authenticatedUser,
    };
  }

  logout() {
    return {
      message: '로그아웃되었습니다.',
    };
  }

  // 프론트 프록시와 백엔드 가드가 같은 이름을 써야 하므로 쿠키 이름은 코드 기본값으로 고정합니다.
  getAccessTokenCookieName() {
    return ACCESS_TOKEN_COOKIE_NAME;
  }

  getAccessTokenCookieOptions() {
    return {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure: false,
    };
  }

  private getAccessTokenExpiresIn() {
    return '24h';
  }
}
