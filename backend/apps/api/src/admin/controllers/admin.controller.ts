import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { RequireRoles } from '@app/common/decorators/roles.decorator';
import { AdminJobsResponseDto } from '../dto/admin-jobs.dto';
import { AdminOutdatedQueriesResponseDto } from '../dto/admin-outdated-queries.dto';
import { AdminStatusResponseDto } from '../dto/admin-status.dto';
import { AdminService } from '../services/admin.service';

@ApiTags('admin')
@RequireRoles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('status')
  @ApiOperation({ summary: '관리자 시스템 상태를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '시스템 상태',
    type: AdminStatusResponseDto,
  })
  getStatus() {
    return this.adminService.getStatus();
  }

  @Get('queries/jobs')
  @ApiOperation({ summary: '관리자 작업 큐 상태를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '큐 및 worker 상태',
    type: AdminJobsResponseDto,
  })
  getJobs() {
    return this.adminService.getJobs();
  }

  @Get('queries/outdated')
  @ApiOperation({ summary: '관리자 outdated query 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: 'outdated query 목록',
    type: AdminOutdatedQueriesResponseDto,
  })
  getOutdatedQueries() {
    return this.adminService.getOutdatedQueries();
  }
}
