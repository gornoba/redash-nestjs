import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  VerificationEmailResponseDto,
  VerifyEmailParamsDto,
  VerifyEmailResponseDto,
} from '../dto/verification.dto';
import { VerificationService } from '../services/verification.service';

@ApiTags('verification')
@Controller()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('verification_email')
  @ApiOperation({ summary: '이메일 인증 메일을 다시 보냅니다.' })
  @ZodResponse({
    status: 201,
    description: '인증 메일 재발송 결과',
    type: VerificationEmailResponseDto,
  })
  resendVerificationEmail(@CurrentUser() user: AuthenticatedUser) {
    return this.verificationService.resendVerificationEmail(user);
  }

  @Public()
  @Get('verify/:token')
  @ApiOperation({ summary: '이메일 인증 토큰을 검증합니다.' })
  @ZodResponse({
    status: 200,
    description: '이메일 인증 결과',
    type: VerifyEmailResponseDto,
  })
  verifyEmail(@Param() params: VerifyEmailParamsDto) {
    return this.verificationService.verifyEmail(params.token);
  }
}
