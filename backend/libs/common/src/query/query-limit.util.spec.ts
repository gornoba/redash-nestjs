import {
  applyDefaultQueryLimit,
  MAX_QUERY_LIMIT,
  normalizeQueryLimit,
} from './query-limit.util';

describe('query-limit.util', () => {
  it('끝에 limit 가 있으면 그대로 유지해야 한다', () => {
    expect(applyDefaultQueryLimit('select * from users limit 50')).toBe(
      'select * from users limit 50',
    );
  });

  it('끝에 limit offset 이 있으면 그대로 유지해야 한다', () => {
    expect(
      applyDefaultQueryLimit('select * from users LIMIT 50 OFFSET 10;'),
    ).toBe('select * from users LIMIT 50 OFFSET 10;');
  });

  it('끝에 limit 가 최대치를 넘으면 10000 으로 캡해야 한다', () => {
    expect(applyDefaultQueryLimit('select * from users LIMIT 50000')).toBe(
      `select * from users LIMIT ${MAX_QUERY_LIMIT}`,
    );
  });

  it('끝에 limit offset 이 최대치를 넘으면 offset 은 유지하고 limit 만 캡해야 한다', () => {
    expect(
      applyDefaultQueryLimit('select * from users LIMIT 50000 OFFSET 30;'),
    ).toBe(`select * from users LIMIT ${MAX_QUERY_LIMIT} OFFSET 30;`);
  });

  it('끝에 limit 가 없으면 기본 limit 1000 을 붙여야 한다', () => {
    expect(applyDefaultQueryLimit('select * from users')).toBe(
      'select * from users LIMIT 1000',
    );
  });

  it('서브쿼리의 limit 는 trailing limit 로 보지 않아야 한다', () => {
    expect(
      applyDefaultQueryLimit(
        'select * from (select * from users limit 5) as u',
      ),
    ).toBe('select * from (select * from users limit 5) as u LIMIT 1000');
  });

  it('정규화 결과에서 캡 여부를 알려줘야 한다', () => {
    expect(normalizeQueryLimit('select * from users limit 50000')).toEqual({
      appliedLimit: MAX_QUERY_LIMIT,
      didApplyDefaultLimit: false,
      didCapLimit: true,
      query: `select * from users limit ${MAX_QUERY_LIMIT}`,
      requestedLimit: 50000,
    });
  });
});
