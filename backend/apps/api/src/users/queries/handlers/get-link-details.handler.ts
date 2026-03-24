import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetLinkDetailsQuery } from '../get-link-details.query';
import { UsersService } from '../../services/users.service';

@QueryHandler(GetLinkDetailsQuery)
export class GetLinkDetailsHandler implements IQueryHandler<GetLinkDetailsQuery> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetLinkDetailsQuery) {
    const user = await this.usersService.getUserFromToken(
      query.token,
      query.mode,
    );

    return {
      mode: query.mode,
      user: {
        name: user.name,
        email: user.email,
      },
    };
  }
}
