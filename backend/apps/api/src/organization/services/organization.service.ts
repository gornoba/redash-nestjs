import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { OrganizationRepository } from '../repositories/organization.repository';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  getStatus(user: AuthenticatedUser) {
    return this.organizationRepository.getStatus(user);
  }
}
