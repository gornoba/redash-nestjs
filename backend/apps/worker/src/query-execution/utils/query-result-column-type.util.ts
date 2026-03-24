import mssql from 'mssql';

const POSTGRES_TYPE_OIDS = {
  BOOL: 16,
  FLOAT4: 700,
  FLOAT8: 701,
  INT8: 20,
  INT2: 21,
  INT4: 23,
  JSON: 114,
  DATE: 1082,
  TIME: 1083,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
  NUMERIC: 1700,
  JSONB: 3802,
} as const;

const MYSQL_TYPE_CODES = {
  DECIMAL: 0x00,
  TINY: 0x01,
  SHORT: 0x02,
  LONG: 0x03,
  FLOAT: 0x04,
  DOUBLE: 0x05,
  TIMESTAMP: 0x07,
  LONGLONG: 0x08,
  INT24: 0x09,
  DATE: 0x0a,
  TIME: 0x0b,
  DATETIME: 0x0c,
  YEAR: 0x0d,
  NEWDATE: 0x0e,
  BIT: 0x10,
  JSON: 0xf5,
  NEWDECIMAL: 0xf6,
} as const;

export function mapPostgresColumnType(dataTypeId: number | undefined) {
  switch (dataTypeId) {
    case POSTGRES_TYPE_OIDS.BOOL:
      return 'bool';
    case POSTGRES_TYPE_OIDS.INT2:
      return 'int2';
    case POSTGRES_TYPE_OIDS.INT4:
      return 'int4';
    case POSTGRES_TYPE_OIDS.INT8:
      return 'int8';
    case POSTGRES_TYPE_OIDS.FLOAT4:
      return 'float4';
    case POSTGRES_TYPE_OIDS.FLOAT8:
      return 'float8';
    case POSTGRES_TYPE_OIDS.NUMERIC:
      return 'numeric';
    case POSTGRES_TYPE_OIDS.DATE:
      return 'date';
    case POSTGRES_TYPE_OIDS.TIME:
      return 'time';
    case POSTGRES_TYPE_OIDS.TIMESTAMP:
      return 'timestamp';
    case POSTGRES_TYPE_OIDS.TIMESTAMPTZ:
      return 'timestamptz';
    case POSTGRES_TYPE_OIDS.JSON:
      return 'json';
    case POSTGRES_TYPE_OIDS.JSONB:
      return 'jsonb';
    default:
      return null;
  }
}

export function mapMysqlColumnType(columnType: number | undefined) {
  switch (columnType) {
    case MYSQL_TYPE_CODES.BIT:
      return 'bit';
    case MYSQL_TYPE_CODES.TINY:
      return 'tinyint';
    case MYSQL_TYPE_CODES.SHORT:
      return 'smallint';
    case MYSQL_TYPE_CODES.LONG:
      return 'int';
    case MYSQL_TYPE_CODES.INT24:
      return 'mediumint';
    case MYSQL_TYPE_CODES.LONGLONG:
      return 'bigint';
    case MYSQL_TYPE_CODES.FLOAT:
      return 'float';
    case MYSQL_TYPE_CODES.DOUBLE:
      return 'double';
    case MYSQL_TYPE_CODES.DECIMAL:
    case MYSQL_TYPE_CODES.NEWDECIMAL:
      return 'decimal';
    case MYSQL_TYPE_CODES.DATE:
    case MYSQL_TYPE_CODES.NEWDATE:
      return 'date';
    case MYSQL_TYPE_CODES.TIME:
      return 'time';
    case MYSQL_TYPE_CODES.DATETIME:
      return 'datetime';
    case MYSQL_TYPE_CODES.TIMESTAMP:
      return 'timestamp';
    case MYSQL_TYPE_CODES.YEAR:
      return 'year';
    case MYSQL_TYPE_CODES.JSON:
      return 'json';
    default:
      return null;
  }
}

export function mapMssqlColumnType(type: unknown) {
  if (type === mssql.Bit) {
    return 'bit';
  }

  if (type === mssql.TinyInt) {
    return 'tinyint';
  }

  if (type === mssql.SmallInt) {
    return 'smallint';
  }

  if (type === mssql.Int) {
    return 'int';
  }

  if (type === mssql.BigInt) {
    return 'bigint';
  }

  if (type === mssql.Real) {
    return 'real';
  }

  if (type === mssql.Float) {
    return 'float';
  }

  if (type === mssql.Decimal) {
    return 'decimal';
  }

  if (type === mssql.Numeric) {
    return 'numeric';
  }

  if (type === mssql.Date) {
    return 'date';
  }

  if (type === mssql.Time) {
    return 'time';
  }

  if (
    type === mssql.DateTime ||
    type === mssql.DateTime2 ||
    type === mssql.DateTimeOffset ||
    type === mssql.SmallDateTime
  ) {
    return 'datetime';
  }

  return null;
}
