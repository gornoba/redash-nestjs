import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { OrganizationStatusResponseDto } from '../dto/organization-status-response.dto';
import { OrganizationService } from '../services/organization.service';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('status')
  @ApiOperation({ summary: '조직 상태 카운터를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '조직 객체 카운터',
    type: OrganizationStatusResponseDto,
  })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationService.getStatus(user);
  }
}
