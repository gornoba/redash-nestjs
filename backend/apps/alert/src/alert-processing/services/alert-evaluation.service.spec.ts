import { AlertEvaluationService } from './alert-evaluation.service';
import { AlertProcessingRepository } from '../repositories/alert-processing.repository';

describe('AlertEvaluationService', () => {
  let service: AlertEvaluationService;
  let notificationDispatchQueue: { add: jest.Mock };
  let alertProcessingRepository: jest.Mocked<AlertProcessingRepository>;

  beforeEach(() => {
    notificationDispatchQueue = {
      add: jest.fn(),
    };
    alertProcessingRepository = {
      getAlertsForQuery: jest.fn(),
      getSubscriptionForDispatch: jest.fn(),
      getSubscriptionsForAlert: jest.fn(),
      saveAlert: jest.fn(),
    } as never;

    service = new AlertEvaluationService(
      notificationDispatchQueue as never,
      alertProcessingRepository,
    );
  });

  it('조건을 만족하면 alert 상태를 triggered로 저장하고 notification job을 추가해야 한다', async () => {
    alertProcessingRepository.getAlertsForQuery.mockResolvedValue([
      {
        id: 10,
        lastTriggeredAt: null,
        options: { column: 'count', op: '>', value: '3' },
        query: {
          latestQueryData: {
            data: {
              rows: [{ count: 5 }],
            },
          },
        },
        rearm: null,
        state: 'unknown',
      },
    ] as never);
    alertProcessingRepository.getSubscriptionsForAlert.mockResolvedValue([
      { id: 101 },
      { id: 102 },
    ] as never);

    await service.processEvaluation(77);

    expect(alertProcessingRepository.saveAlert.mock.calls).toHaveLength(1);
    expect(alertProcessingRepository.saveAlert.mock.calls[0][0]).toMatchObject({
      id: 10,
      state: 'triggered',
    });
    expect(notificationDispatchQueue.add.mock.calls).toEqual([
      [
        'dispatch-notification',
        { alertId: 10, state: 'triggered', subscriptionId: 101 },
        { removeOnComplete: 1000, removeOnFail: 1000 },
      ],
      [
        'dispatch-notification',
        { alertId: 10, state: 'triggered', subscriptionId: 102 },
        { removeOnComplete: 1000, removeOnFail: 1000 },
      ],
    ]);
  });

  it('unknown에서 ok로 바뀌는 첫 평가에서는 외부 알림을 보내지 않아야 한다', async () => {
    alertProcessingRepository.getAlertsForQuery.mockResolvedValue([
      {
        id: 11,
        lastTriggeredAt: null,
        options: { column: 'count', op: '>', value: '10' },
        query: {
          latestQueryData: {
            data: {
              rows: [{ count: 1 }],
            },
          },
        },
        rearm: null,
        state: 'unknown',
      },
    ] as never);

    await service.processEvaluation(88);

    expect(alertProcessingRepository.saveAlert.mock.calls).toHaveLength(1);
    expect(alertProcessingRepository.saveAlert.mock.calls[0][0]).toMatchObject({
      id: 11,
      state: 'ok',
    });
    expect(notificationDispatchQueue.add).not.toHaveBeenCalled();
  });

  it('muted alert는 상태만 갱신하고 notification job을 추가하지 않아야 한다', async () => {
    alertProcessingRepository.getAlertsForQuery.mockResolvedValue([
      {
        id: 12,
        lastTriggeredAt: null,
        options: { column: 'count', muted: true, op: '>', value: '1' },
        query: {
          latestQueryData: {
            data: {
              rows: [{ count: 5 }],
            },
          },
        },
        rearm: null,
        state: 'ok',
      },
    ] as never);

    await service.processEvaluation(99);

    expect(alertProcessingRepository.saveAlert.mock.calls).toHaveLength(1);
    expect(alertProcessingRepository.saveAlert.mock.calls[0][0]).toMatchObject({
      id: 12,
      state: 'triggered',
    });
    expect(notificationDispatchQueue.add).not.toHaveBeenCalled();
  });
});
