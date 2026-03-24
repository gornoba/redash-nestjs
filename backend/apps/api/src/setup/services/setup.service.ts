import { ConflictException, Injectable } from '@nestjs/common';

import type { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupRepository } from '../repositories/setup.repository';

@Injectable()
export class SetupService {
  constructor(private readonly setupRepository: SetupRepository) {}

  getSetupState() {
    return this.setupRepository.getSetupState();
  }

  async createSetup(payload: CreateSetupDto) {
    const setupState = await this.setupRepository.getSetupState();

    if (!setupState.isSetupRequired) {
      throw new ConflictException('이미 설정이 완료되었습니다.');
    }

    const result = await this.setupRepository.createSetup(payload);

    return {
      message: '설정이 완료되었습니다.',
      ...result,
    };
  }
}
