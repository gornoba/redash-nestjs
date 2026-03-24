import { Injectable, Logger } from '@nestjs/common';

import type { QueryExecutionJobPayload } from '@app/common/queue/queue.constants';
import { FailureTrackingService } from './failure-tracking.service';
import { QueryExecutionService } from './query-execution.service';

@Injectable()
export class ScheduledQueryExecutionService {
  private readonly logger = new Logger(ScheduledQueryExecutionService.name);

  constructor(
    private readonly failureTrackingService: FailureTrackingService,
    private readonly queryExecutionService: QueryExecutionService,
  ) {}

  async executeScheduled(payload: QueryExecutionJobPayload) {
    const result = await this.queryExecutionService.execute(payload);

    await this.failureTrackingService.recordSuccess(
      payload.queryId,
      result.retrieved_at,
    );
    this.logger.log({
      event: 'scheduled_query_executed',
      queryId: payload.queryId,
      queryResultId: result.query_result_id,
      retrievedAt: result.retrieved_at,
    });

    return result;
  }
}
