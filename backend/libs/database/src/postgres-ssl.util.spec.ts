import {
  isAwsRdsPostgresHost,
  resolvePostgresSslOption,
} from './postgres-ssl.util';

describe('postgresSslUtil', () => {
  it('AWS RDS 호스트면 SSL 옵션을 반환해야 한다', () => {
    expect(
      resolvePostgresSslOption(
        'redash-prod.cluster-abcdefghijkl.ap-northeast-2.rds.amazonaws.com',
      ),
    ).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('AWS RDS 호스트가 아니면 SSL을 비활성화해야 한다', () => {
    expect(resolvePostgresSslOption('postgres')).toBe(false);
    expect(resolvePostgresSslOption('127.0.0.1')).toBe(false);
  });

  it('AWS RDS 호스트를 판별해야 한다', () => {
    expect(
      isAwsRdsPostgresHost(
        'redash-prod.cluster-abcdefghijkl.ap-northeast-2.rds.amazonaws.com',
      ),
    ).toBe(true);
    expect(isAwsRdsPostgresHost('postgres.internal')).toBe(false);
  });
});
