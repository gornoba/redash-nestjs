export const MASKED_SECRET_VALUE = '******';

export type SupportedDataSourceType =
  | 'aurora-mysql'
  | 'aurora-postgres'
  | 'cockroach'
  | 'cockroachdb'
  | 'mariadb'
  | 'mssql'
  | 'mysql'
  | 'oracle'
  | 'pg'
  | 'sqlite';

export interface DataSourceTypeSchemaProperty {
  default?: unknown;
  extendedEnum?: Array<{ name: string; value: string }>;
  options?: Array<{ name: string; value: string }>;
  title?: string;
  type: string;
}

export interface DataSourceConfigurationSchema {
  extra_options?: string[];
  order?: string[];
  properties: Record<string, DataSourceTypeSchemaProperty>;
  required?: string[];
  secret?: string[];
  type: string;
}

export interface DataSourceTypeDefinition {
  configuration_schema: DataSourceConfigurationSchema;
  name: string;
  supports_auto_limit: boolean;
  syntax: string;
  type: SupportedDataSourceType;
}

const POSTGRES_CONFIGURATION_SCHEMA: DataSourceConfigurationSchema = {
  type: 'object',
  properties: {
    user: { type: 'string' },
    password: { type: 'string' },
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'number', default: 5432 },
    dbname: { type: 'string', title: 'Database Name' },
    sslmode: {
      type: 'string',
      title: 'SSL Mode',
      default: 'prefer',
      extendedEnum: [
        { value: 'disable', name: 'Disable' },
        { value: 'allow', name: 'Allow' },
        { value: 'prefer', name: 'Prefer' },
        { value: 'require', name: 'Require' },
        { value: 'verify-ca', name: 'Verify CA' },
        { value: 'verify-full', name: 'Verify Full' },
      ],
    },
    sslrootcertFile: { type: 'string', title: 'SSL Root Certificate' },
    sslcertFile: { type: 'string', title: 'SSL Client Certificate' },
    sslkeyFile: { type: 'string', title: 'SSL Client Key' },
  },
  order: ['host', 'port', 'user', 'password'],
  required: ['dbname'],
  secret: ['password', 'sslrootcertFile', 'sslcertFile', 'sslkeyFile'],
  extra_options: ['sslmode', 'sslrootcertFile', 'sslcertFile', 'sslkeyFile'],
};

const MYSQL_CONFIGURATION_SCHEMA: DataSourceConfigurationSchema = {
  type: 'object',
  properties: {
    host: { type: 'string', default: '127.0.0.1' },
    user: { type: 'string' },
    passwd: { type: 'string', title: 'Password' },
    db: { type: 'string', title: 'Database name' },
    port: { type: 'number', default: 3306 },
    use_ssl: { type: 'boolean', title: 'Use SSL' },
    ssl_cacert: {
      type: 'string',
      title: 'Path to CA certificate file to verify peer against (SSL)',
    },
    ssl_cert: {
      type: 'string',
      title: 'Path to client certificate file (SSL)',
    },
    ssl_key: {
      type: 'string',
      title: 'Path to private key file (SSL)',
    },
  },
  order: ['host', 'port', 'user', 'passwd', 'db'],
  required: ['db'],
  secret: ['passwd'],
  extra_options: ['use_ssl', 'ssl_cacert', 'ssl_cert', 'ssl_key'],
};

const MSSQL_CONFIGURATION_SCHEMA: DataSourceConfigurationSchema = {
  type: 'object',
  properties: {
    user: { type: 'string' },
    password: { type: 'string' },
    server: { type: 'string', default: '127.0.0.1' },
    port: { type: 'number', default: 1433 },
    tds_version: {
      type: 'string',
      default: '7.0',
      title: 'TDS Version',
    },
    charset: {
      type: 'string',
      default: 'UTF-8',
      title: 'Character Set',
    },
    db: { type: 'string', title: 'Database Name' },
  },
  required: ['db'],
  secret: ['password'],
  extra_options: ['tds_version', 'charset'],
};

const ORACLE_CONFIGURATION_SCHEMA: DataSourceConfigurationSchema = {
  type: 'object',
  properties: {
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'number', default: 1521 },
    user: { type: 'string' },
    password: { type: 'string' },
    serviceName: { type: 'string', title: 'Service Name' },
    sid: { type: 'string', title: 'SID' },
  },
  order: ['host', 'port', 'user', 'password', 'serviceName', 'sid'],
  secret: ['password'],
};

const SQLITE_CONFIGURATION_SCHEMA: DataSourceConfigurationSchema = {
  type: 'object',
  properties: {
    database: { type: 'string', title: 'Database Path' },
  },
  order: ['database'],
  required: ['database'],
};

export const DATA_SOURCE_TYPE_DEFINITIONS: DataSourceTypeDefinition[] = [
  {
    type: 'aurora-mysql' as const,
    name: 'Amazon Aurora MySQL',
    configuration_schema: MYSQL_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'aurora-postgres' as const,
    name: 'Amazon Aurora PostgreSQL',
    configuration_schema: POSTGRES_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'cockroach' as const,
    name: 'CockroachDB',
    configuration_schema: POSTGRES_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'cockroachdb' as const,
    name: 'CockroachDB (TypeORM)',
    configuration_schema: POSTGRES_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'mariadb' as const,
    name: 'MariaDB',
    configuration_schema: MYSQL_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'mssql' as const,
    name: 'Microsoft SQL Server',
    configuration_schema: MSSQL_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'mysql' as const,
    name: 'MySQL',
    configuration_schema: MYSQL_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'oracle' as const,
    name: 'Oracle',
    configuration_schema: ORACLE_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'pg' as const,
    name: 'PostgreSQL',
    configuration_schema: POSTGRES_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
  {
    type: 'sqlite' as const,
    name: 'SQLite',
    configuration_schema: SQLITE_CONFIGURATION_SCHEMA,
    syntax: 'sql',
    supports_auto_limit: true,
  },
].sort((left, right) => left.name.localeCompare(right.name));

export function getDataSourceTypeDefinition(type: string) {
  return DATA_SOURCE_TYPE_DEFINITIONS.find((item) => item.type === type);
}
