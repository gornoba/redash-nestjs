import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '@app/common/decorators/public.decorator';
import { LoginResponseDto, LogoutResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.schema';
import { AuthService } from '../services/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '이메일과 비밀번호로 로그인합니다.' })
  @ZodResponse({
    status: 201,
    description: '로그인 결과',
    type: LoginResponseDto,
  })
  async login(
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(payload);

    reply.setCookie(
      this.authService.getAccessTokenCookieName(),
      result.accessToken,
      this.authService.getAccessTokenCookieOptions(),
    );

    return result;
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: '현재 인증 쿠키를 제거합니다.' })
  @ZodResponse({
    status: 201,
    description: '로그아웃 결과',
    type: LogoutResponseDto,
  })
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(
      this.authService.getAccessTokenCookieName(),
      this.authService.getAccessTokenCookieOptions(),
    );

    return this.authService.logout();
  }
}
