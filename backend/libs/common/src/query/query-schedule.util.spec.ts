import {
  isQueryScheduleExpired,
  isScheduledQueryDue,
  shouldScheduleNext,
} from './query-schedule.util';

describe('query schedule util', () => {
  describe('shouldScheduleNext', () => {
    it('간격 기반 스케줄은 이전 실행 시각 이후 interval이 지나면 실행 대상이어야 한다', () => {
      expect(
        shouldScheduleNext(
          new Date('2026-03-16T00:00:00.000Z'),
          new Date('2026-03-16T00:05:01.000Z'),
          300,
        ),
      ).toBe(true);
    });

    it('일간 스케줄은 UTC 시간 기준 다음 실행 시각 전이면 실행 대상이 아니어야 한다', () => {
      expect(
        shouldScheduleNext(
          new Date('2026-03-15T23:50:00.000Z'),
          new Date('2026-03-16T00:14:59.000Z'),
          86_400,
          '00:15',
        ),
      ).toBe(false);
    });
  });

  describe('isQueryScheduleExpired', () => {
    it('until 날짜가 현재보다 이전이거나 같으면 만료되어야 한다', () => {
      expect(
        isQueryScheduleExpired(
          {
            interval: 300,
            until: '2026-03-16',
          },
          new Date('2026-03-16T00:00:00.000Z'),
        ),
      ).toBe(true);
    });
  });

  describe('isScheduledQueryDue', () => {
    it('last_execute가 없으면 schedule 저장 시각(updatedAt)을 기준으로 계산해야 한다', () => {
      expect(
        isScheduledQueryDue(
          {
            schedule: {
              interval: 300,
              last_execute: null,
            },
            scheduleFailures: 0,
            updatedAt: new Date('2026-03-16T00:00:00.000Z'),
          },
          new Date('2026-03-16T00:05:01.000Z'),
        ),
      ).toBe(true);
    });

    it('disabled 스케줄은 실행 대상이 아니어야 한다', () => {
      expect(
        isScheduledQueryDue(
          {
            schedule: {
              disabled: true,
              interval: 300,
              last_execute: '2026-03-16T00:00:00.000Z',
            },
            scheduleFailures: 0,
            updatedAt: new Date('2026-03-16T00:00:00.000Z'),
          },
          new Date('2026-03-16T00:10:00.000Z'),
        ),
      ).toBe(false);
    });
  });
});
