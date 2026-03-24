import { FailureTrackingService } from './failure-tracking.service';
import { QueryExecutionService } from './query-execution.service';
import { ScheduledQueryExecutionService } from './scheduled-query-execution.service';

describe('ScheduledQueryExecutionService', () => {
  let service: ScheduledQueryExecutionService;
  let failureTrackingService: jest.Mocked<FailureTrackingService>;
  let queryExecutionService: jest.Mocked<QueryExecutionService>;

  beforeEach(() => {
    failureTrackingService = {
      recordFailure: jest.fn(),
      recordSuccess: jest.fn(),
    } as never;
    queryExecutionService = {
      execute: jest.fn(),
    } as never;

    service = new ScheduledQueryExecutionService(
      failureTrackingService,
      queryExecutionService,
    );
  });

  it('scheduled execution 성공 시 last_execute 기록을 위한 success tracking을 호출해야 한다', async () => {
    queryExecutionService.execute.mockResolvedValue({
      query_result_id: 91,
      retrieved_at: '2026-03-16T00:05:01.000Z',
    } as never);

    await service.executeScheduled({
      dataSourceId: 10,
      orgId: 1,
      persistLatestQueryData: true,
      queryId: 3,
      queryText: 'select 1',
      requestedByUserId: 7,
    });

    expect(failureTrackingService.recordSuccess.mock.calls).toEqual([
      [3, '2026-03-16T00:05:01.000Z'],
    ]);
  });
});
