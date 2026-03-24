import mssql from 'mssql';

import {
  mapMssqlColumnType,
  mapMysqlColumnType,
  mapPostgresColumnType,
} from './query-result-column-type.util';

describe('query result column type util', () => {
  it('maps postgres date and timestamp oids', () => {
    expect(mapPostgresColumnType(1082)).toBe('date');
    expect(mapPostgresColumnType(1114)).toBe('timestamp');
    expect(mapPostgresColumnType(1184)).toBe('timestamptz');
    expect(mapPostgresColumnType(999999)).toBeNull();
  });

  it('maps mysql date and datetime column codes', () => {
    expect(mapMysqlColumnType(0x0a)).toBe('date');
    expect(mapMysqlColumnType(0x0c)).toBe('datetime');
    expect(mapMysqlColumnType(0x07)).toBe('timestamp');
    expect(mapMysqlColumnType(0xffff)).toBeNull();
  });

  it('maps mssql date-like column types', () => {
    expect(mapMssqlColumnType(mssql.Date)).toBe('date');
    expect(mapMssqlColumnType(mssql.DateTime)).toBe('datetime');
    expect(mapMssqlColumnType(mssql.DateTime2)).toBe('datetime');
    expect(mapMssqlColumnType(mssql.Time)).toBe('time');
    expect(mapMssqlColumnType(Symbol('unknown'))).toBeNull();
  });
});
