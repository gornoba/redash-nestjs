import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '@app/common/decorators/public.decorator';
import { CreateSetupDto } from '../dto/create-setup.schema';
import {
  CreateSetupResponseDto,
  SetupStateResponseDto,
} from '../dto/setup-response.dto';
import { SetupService } from '../services/setup.service';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '초기 설정 필요 여부를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '설정 상태',
    type: SetupStateResponseDto,
  })
  getSetupState() {
    return this.setupService.getSetupState();
  }

  @Public()
  @Post()
  @ApiOperation({ summary: '초기 조직과 관리자 사용자를 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '설정 생성 결과',
    type: CreateSetupResponseDto,
  })
  createSetup(@Body() payload: CreateSetupDto) {
    return this.setupService.createSetup(payload);
  }
}
