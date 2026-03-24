import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { HealthStatusDto } from './health-response.dto';
import { ZodResponse } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '백엔드 헬스 상태를 반환합니다.' })
  @ZodResponse({
    status: 200,
    description: '헬스 상태',
    type: HealthStatusDto,
  })
  getHealth() {
    return {
      service: (this.configService.get('APP_NAME') as string) ?? 'backend',
      status: 'ok',
    };
  }
}
