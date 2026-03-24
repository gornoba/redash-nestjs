import { queryResultSchema } from './query-execution.dto';

describe('queryResultSchema', () => {
  it('레거시 query result data 에 truncated 가 없어도 직렬화 가능해야 한다', () => {
    expect(
      queryResultSchema.parse({
        id: 1292899,
        data_source_id: 19,
        query: 'select 1',
        retrieved_at: '2026-03-15T15:15:14.944Z',
        runtime: 0.4142434597015381,
        data: {
          columns: [
            {
              friendly_name: '예약일자',
              name: '예약일자',
              type: 'date',
            },
          ],
          rows: [
            {
              예약일자: '2026-03-17',
            },
          ],
        },
      }),
    ).toEqual({
      id: 1292899,
      data_source_id: 19,
      query: 'select 1',
      retrieved_at: '2026-03-15T15:15:14.944Z',
      runtime: 0.4142434597015381,
      data: {
        columns: [
          {
            friendly_name: '예약일자',
            name: '예약일자',
            type: 'date',
          },
        ],
        rows: [
          {
            예약일자: '2026-03-17',
          },
        ],
        truncated: false,
      },
    });
  });
});
