import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { RequireRoles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  AcceptLinkRequestDto,
  AcceptLinkResponseDto,
  CreateUserRequestDto,
  CreateUserResponseDto,
  LinkTokenDetailsResponseDto,
  LinkTokenQueryDto,
  InviteTokenParamDto,
  UpdateUserRequestDto,
  UserDetailResponseDto,
  UserIdParamDto,
} from '../dto/users.dto';
import { AcceptLinkCommand } from '../commands/accept-link.command';
import { CreateUserCommand } from '../commands/create-user.command';
import { DeleteUserCommand } from '../commands/delete-user.command';
import { DisableUserCommand } from '../commands/disable-user.command';
import { EnableUserCommand } from '../commands/enable-user.command';
import { RegenerateApiKeyCommand } from '../commands/regenerate-api-key.command';
import { ResendInvitationCommand } from '../commands/resend-invitation.command';
import { SendPasswordResetCommand } from '../commands/send-password-reset.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { GetLinkDetailsQuery } from '../queries/get-link-details.query';
import { GetUserQuery } from '../queries/get-user.query';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @RequireRoles('admin')
  @Post()
  @ApiOperation({ summary: '새 사용자를 초대합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 사용자',
    type: CreateUserResponseDto,
  })
  createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateUserRequestDto,
  ) {
    return this.commandBus.execute(new CreateUserCommand(user, payload));
  }

  @Public()
  @Get('invitations')
  @ApiOperation({ summary: '초대 토큰 정보를 조회합니다. (query)' })
  @ZodResponse({
    status: 200,
    description: '초대된 사용자 정보',
    type: LinkTokenDetailsResponseDto,
  })
  getInviteDetailsByQuery(@Query() query: LinkTokenQueryDto) {
    return this.queryBus.execute(
      new GetLinkDetailsQuery(query.token, 'invite'),
    );
  }

  @Public()
  @Get('invitations/:token')
  @ApiOperation({ summary: '초대 토큰 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '초대된 사용자 정보',
    type: LinkTokenDetailsResponseDto,
  })
  getInviteDetails(@Param() params: InviteTokenParamDto) {
    return this.queryBus.execute(
      new GetLinkDetailsQuery(params.token, 'invite'),
    );
  }

  @Public()
  @Post('invitations')
  @ApiOperation({
    summary: '초대를 수락하고 비밀번호를 설정합니다. (body token)',
  })
  @ZodResponse({
    status: 201,
    description: '초대 수락 결과',
    type: AcceptLinkResponseDto,
  })
  acceptInviteByBody(@Body() payload: AcceptLinkRequestDto) {
    return this.commandBus.execute(
      new AcceptLinkCommand(payload.token!, 'invite', payload),
    );
  }

  @Public()
  @Post('invitations/:token')
  @ApiOperation({ summary: '초대를 수락하고 비밀번호를 설정합니다.' })
  @ZodResponse({
    status: 201,
    description: '초대 수락 결과',
    type: AcceptLinkResponseDto,
  })
  acceptInvite(
    @Param() params: InviteTokenParamDto,
    @Body() payload: AcceptLinkRequestDto,
  ) {
    return this.commandBus.execute(
      new AcceptLinkCommand(params.token, 'invite', payload),
    );
  }

  @Public()
  @Get('reset')
  @ApiOperation({ summary: '비밀번호 재설정 토큰 정보를 조회합니다. (query)' })
  @ZodResponse({
    status: 200,
    description: '비밀번호 재설정 사용자 정보',
    type: LinkTokenDetailsResponseDto,
  })
  getResetDetailsByQuery(@Query() query: LinkTokenQueryDto) {
    return this.queryBus.execute(new GetLinkDetailsQuery(query.token, 'reset'));
  }

  @Public()
  @Get('reset/:token')
  @ApiOperation({ summary: '비밀번호 재설정 토큰 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '비밀번호 재설정 사용자 정보',
    type: LinkTokenDetailsResponseDto,
  })
  getResetDetails(@Param() params: InviteTokenParamDto) {
    return this.queryBus.execute(
      new GetLinkDetailsQuery(params.token, 'reset'),
    );
  }

  @Public()
  @Post('reset')
  @ApiOperation({ summary: '비밀번호를 재설정합니다. (body token)' })
  @ZodResponse({
    status: 201,
    description: '비밀번호 재설정 결과',
    type: AcceptLinkResponseDto,
  })
  resetPasswordWithBodyToken(@Body() payload: AcceptLinkRequestDto) {
    return this.commandBus.execute(
      new AcceptLinkCommand(payload.token!, 'reset', payload),
    );
  }

  @Public()
  @Post('reset/:token')
  @ApiOperation({ summary: '비밀번호를 재설정합니다.' })
  @ZodResponse({
    status: 201,
    description: '비밀번호 재설정 결과',
    type: AcceptLinkResponseDto,
  })
  resetPasswordWithToken(
    @Param() params: InviteTokenParamDto,
    @Body() payload: AcceptLinkRequestDto,
  ) {
    return this.commandBus.execute(
      new AcceptLinkCommand(params.token, 'reset', payload),
    );
  }

  @Get(':userId')
  @ApiOperation({ summary: '사용자 상세 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '사용자 상세 정보',
    type: UserDetailResponseDto,
  })
  getUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.queryBus.execute(new GetUserQuery(user, params.userId));
  }

  @Post(':userId')
  @ApiOperation({ summary: '사용자 정보를 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 사용자 정보',
    type: UserDetailResponseDto,
  })
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
    @Body() payload: UpdateUserRequestDto,
  ) {
    return this.commandBus.execute(
      new UpdateUserCommand(user, params.userId, payload),
    );
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'pending 사용자를 삭제합니다.' })
  @ZodResponse({
    status: 200,
    description: '삭제된 사용자 정보',
    type: CreateUserResponseDto,
  })
  deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.commandBus.execute(new DeleteUserCommand(user, params.userId));
  }

  @Post(':userId/invite')
  @ApiOperation({ summary: '초대 메일을 재전송합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 사용자 정보',
    type: UserDetailResponseDto,
  })
  resendInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.commandBus.execute(
      new ResendInvitationCommand(user, params.userId),
    );
  }

  @Post(':userId/reset_password')
  @ApiOperation({ summary: '비밀번호 재설정 메일을 발송합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 사용자 정보',
    type: UserDetailResponseDto,
  })
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.commandBus.execute(
      new SendPasswordResetCommand(user, params.userId),
    );
  }

  @Post(':userId/regenerate_api_key')
  @ApiOperation({ summary: 'API Key를 재생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 사용자 정보',
    type: UserDetailResponseDto,
  })
  regenerateApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.commandBus.execute(
      new RegenerateApiKeyCommand(user, params.userId),
    );
  }

  @Post(':userId/disable')
  @ApiOperation({ summary: '사용자를 비활성화합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 사용자 정보',
    type: UserDetailResponseDto,
  })
  disableUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.commandBus.execute(new DisableUserCommand(user, params.userId));
  }

  @Delete(':userId/disable')
  @ApiOperation({ summary: '사용자를 활성화합니다.' })
  @ZodResponse({
    status: 200,
    description: '업데이트된 사용자 정보',
    type: UserDetailResponseDto,
  })
  enableUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ) {
    return this.commandBus.execute(new EnableUserCommand(user, params.userId));
  }
}
