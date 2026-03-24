import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SessionService } from '../services/session.service';

@ApiTags('session')
@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: '현재 세션 사용자 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '세션 정보',
    type: SessionResponseDto,
  })
  getSession(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionService.getSession(user);
  }
}
