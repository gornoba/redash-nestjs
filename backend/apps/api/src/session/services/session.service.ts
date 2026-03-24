import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async getSession(user: AuthenticatedUser) {
    return this.sessionRepository.getSessionPayload(user);
  }
}
