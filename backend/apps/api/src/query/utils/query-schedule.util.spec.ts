import {
  QUERY_SCHEDULE_LAST_EXECUTE_KEY,
  resetQueryScheduleLastExecute,
  setQueryScheduleLastExecute,
} from './query-schedule.util';

describe('query schedule util', () => {
  it('새 스케줄 저장 시 last_execute를 null로 초기화해야 한다', () => {
    expect(
      resetQueryScheduleLastExecute({
        interval: 300,
        last_execute: '2026-03-16T01:02:03.000Z',
        time: '00:15',
      }),
    ).toEqual({
      interval: 300,
      last_execute: null,
      time: '00:15',
    });
  });

  it('스케줄 실행 시 last_execute만 ISO 문자열로 갱신해야 한다', () => {
    const executedAt = new Date('2026-03-16T02:03:04.000Z');

    expect(
      setQueryScheduleLastExecute(
        {
          day_of_week: 'Monday',
          interval: 3600,
          last_execute: null,
          time: '00:15',
        },
        executedAt,
      ),
    ).toEqual({
      day_of_week: 'Monday',
      interval: 3600,
      last_execute: '2026-03-16T02:03:04.000Z',
      time: '00:15',
    });
  });

  it('상수 키 이름은 last_execute여야 한다', () => {
    expect(QUERY_SCHEDULE_LAST_EXECUTE_KEY).toBe('last_execute');
  });
});
