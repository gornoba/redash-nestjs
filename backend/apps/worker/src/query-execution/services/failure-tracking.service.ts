import { Injectable, Logger } from '@nestjs/common';

import { WorkerQueryRepository } from '../repositories/worker-query.repository';

@Injectable()
export class FailureTrackingService {
  private readonly logger = new Logger(FailureTrackingService.name);

  constructor(private readonly workerQueryRepository: WorkerQueryRepository) {}

  async recordFailure(queryId: number | null, errorMessage: string) {
    if (queryId === null) {
      return;
    }

    await this.workerQueryRepository.recordScheduledExecutionFailure(queryId);
    this.logger.warn({
      errorMessage,
      event: 'scheduled_failure_recorded',
      queryId,
    });
  }

  async recordSuccess(queryId: number | null, retrievedAt: string) {
    if (queryId === null) {
      return;
    }

    await this.workerQueryRepository.recordScheduledExecutionSuccess(
      queryId,
      retrievedAt,
    );
    this.logger.log({
      event: 'scheduled_success_recorded',
      queryId,
      retrievedAt,
    });
  }
}
