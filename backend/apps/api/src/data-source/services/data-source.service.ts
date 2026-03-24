import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import mysql from 'mysql2/promise';
import mssql from 'mssql';
import { Client as PgClient } from 'pg';
import { DataSource } from 'typeorm';

import {
  decryptJsonValue,
  encryptJsonValue,
  normalizeEncryptedPayload,
} from '@app/common/utils/crypto.util';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { resolvePostgresSslOption } from '@app/database/postgres-ssl.util';
import {
  getDataSourceTypeDefinition,
  MASKED_SECRET_VALUE,
  type DataSourceTypeSchemaProperty,
  type DataSourceTypeDefinition,
  type SupportedDataSourceType,
} from '../data-source.constants';
import type {
  DataSourceSchemaColumn,
  DataSourceSchemaRelation,
  DataSourceSchemaResponse,
  DataSourceSchemaTable,
} from '../dto/data-source.dto';
import { DataSourceRepository } from '../repositories/data-source.repository';

export type DataSourceOptions = Record<string, unknown>;

@Injectable()
export class DataSourceService {
  constructor(private readonly dataSourceRepository: DataSourceRepository) {}

  async getSchema(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
  ): Promise<DataSourceSchemaResponse> {
    // schema 조회는 DB 타입별 구현 차이가 커서 여기서 분기하고,
    // handler 에서는 타입 세부사항을 알지 않게 유지한다.
    switch (type) {
      case 'aurora-postgres':
      case 'cockroach':
      case 'cockroachdb':
      case 'pg':
        return this.getPostgresSchema(options);
      case 'aurora-mysql':
      case 'mariadb':
      case 'mysql':
        return this.getMysqlSchema(options);
      case 'mssql':
        return this.getMssqlSchema(options);
      case 'oracle':
        return this.getOracleSchema(options);
      case 'sqlite':
        return this.getSqliteSchema(options);
      default:
        throw new InternalServerErrorException(
          '지원하지 않는 스키마 조회 타입입니다.',
        );
    }
  }
  //
  async buildDetailResponse(
    dataSource: {
      id: number;
      encryptedOptions: string | Buffer;
      name: string;
      queueName: string;
      scheduledQueueName: string;
      type: string;
    },
    groups?: Awaited<ReturnType<DataSourceRepository['getDataSourceGroups']>>,
  ) {
    const definition = this.getDefinitionOrThrow(dataSource.type);
    const dataSourceGroups =
      groups ??
      (await this.dataSourceRepository.getDataSourceGroups(dataSource.id));

    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      syntax: definition.syntax,
      paused: false,
      pause_reason: null,
      supports_auto_limit: definition.supports_auto_limit,
      options: this.maskSecretOptions(
        definition,
        this.parseOptions(dataSource.encryptedOptions),
      ),
      queue_name: dataSource.queueName,
      scheduled_queue_name: dataSource.scheduledQueueName,
      groups: dataSourceGroups.map((group) => ({
        id: group.groupId,
        name: group.group?.name ?? `Group ${group.groupId}`,
        view_only: group.viewOnly,
      })),
      view_only:
        dataSourceGroups.length > 0
          ? dataSourceGroups.every((group) => group.viewOnly)
          : false,
    };
  }

  canViewDataSourceSettings(user: AuthenticatedUser) {
    return (
      user.roles.includes('admin') ||
      user.permissions.includes('list_data_sources')
    );
  }

  getDefinitionOrThrow(type: string) {
    const definition = getDataSourceTypeDefinition(type);

    if (!definition) {
      throw new BadRequestException(
        `지원하지 않는 데이터 소스 타입입니다: ${type}`,
      );
    }

    return definition;
  }

  async ensureUniqueName(orgId: number, name: string, excludeId?: number) {
    const existing = await this.dataSourceRepository.findByName(
      orgId,
      name,
      excludeId,
    );

    if (existing) {
      throw new BadRequestException(
        `Data source with the name ${name} already exists.`,
      );
    }
  }

  parseOptions(value: string | Buffer | null | undefined): DataSourceOptions {
    const normalizedValue = normalizeEncryptedPayload(value);

    if (!normalizedValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(normalizedValue) as unknown;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as DataSourceOptions;
      }
    } catch {
      // 레거시 데이터는 평문 JSON 이 아니라 암호문으로 저장돼 있을 수 있어서
      // JSON 파싱 실패 시 바로 예외를 내지 않고 복호화 포맷을 한 번 더 시도한다.
      const decrypted = decryptJsonValue<DataSourceOptions>(normalizedValue);

      if (decrypted) {
        return decrypted;
      }
    }

    return {};
  }

  serializeOptions(value: DataSourceOptions) {
    const encrypted = encryptJsonValue(value);

    if (!encrypted) {
      throw new InternalServerErrorException(
        '데이터 소스 옵션 암호화에 실패했습니다.',
      );
    }

    return encrypted;
  }

  maskSecretOptions(
    definition: DataSourceTypeDefinition,
    options: DataSourceOptions,
  ) {
    const secretKeys = this.getSecretKeys(definition);
    const nextOptions = { ...options };

    for (const secretKey of secretKeys) {
      if (
        nextOptions[secretKey] !== undefined &&
        nextOptions[secretKey] !== null
      ) {
        nextOptions[secretKey] = MASKED_SECRET_VALUE;
      }
    }

    return nextOptions;
  }

  normalizeOptions(
    definition: DataSourceTypeDefinition,
    options: DataSourceOptions,
    existingOptions: DataSourceOptions,
  ) {
    const properties = this.getProperties(definition);
    const requiredKeys = this.getRequiredKeys(definition);
    const secretKeys = this.getSecretKeys(definition);
    const nextOptions: DataSourceOptions = {};

    for (const [key, property] of Object.entries(properties)) {
      const rawValue = options[key];
      const previousValue = existingOptions[key];
      const normalizedValue = this.normalizePropertyValue(
        property,
        rawValue,
        previousValue,
        secretKeys.includes(key),
      );

      if (normalizedValue !== undefined) {
        nextOptions[key] = normalizedValue;
      }
    }

    // required 검사는 normalize 이후에 해야 secret 보존과 문자열 trimming 결과를 함께 반영할 수 있다.
    for (const requiredKey of requiredKeys) {
      const value = nextOptions[requiredKey];
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`${requiredKey} is required.`);
      }
    }

    this.validateOptions(definition.type, nextOptions);

    return nextOptions;
  }

  private validateOptions(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
  ) {
    if (type === 'oracle') {
      const sid = this.getStringOption(options, 'sid', '').trim();
      const serviceName = this.getStringOption(
        options,
        'serviceName',
        '',
      ).trim();

      if (!sid && !serviceName) {
        throw new BadRequestException(
          'Oracle data source requires a Service Name or SID.',
        );
      }
    }
  }

  private normalizePropertyValue(
    property: DataSourceTypeSchemaProperty,
    value: unknown,
    previousValue: unknown,
    isSecret: boolean,
  ) {
    if (isSecret && value === MASKED_SECRET_VALUE) {
      // 프론트가 마스킹 문자열을 다시 보내는 경우는 "변경하지 않음" 의미로 취급한다.
      return previousValue;
    }

    if (value === '' || value === null) {
      return undefined;
    }

    if (value === undefined) {
      return previousValue;
    }

    const propertyType =
      typeof property.type === 'string' ? property.type : 'string';

    if (propertyType === 'number') {
      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string') {
        const nextValue = Number(value);
        if (Number.isNaN(nextValue)) {
          throw new BadRequestException('숫자 필드 형식이 올바르지 않습니다.');
        }

        return nextValue;
      }
    }

    if (propertyType === 'boolean') {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        return value === 'true';
      }
    }

    if (typeof value === 'string') {
      return value;
    }

    return value;
  }

  private getProperties(definition: DataSourceTypeDefinition) {
    return definition.configuration_schema.properties ?? {};
  }

  private getRequiredKeys(definition: DataSourceTypeDefinition) {
    return definition.configuration_schema.required ?? [];
  }

  private getSecretKeys(definition: DataSourceTypeDefinition) {
    return definition.configuration_schema.secret ?? [];
  }

  async performConnectionTest(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
  ) {
    // 연결 테스트는 조회 API 에서도 재사용되므로 타입별 어댑터 선택을 한 곳에 모은다.
    switch (type) {
      case 'aurora-postgres':
      case 'pg':
      case 'cockroach':
      case 'cockroachdb':
        return this.testPostgresConnection(type, options);
      case 'aurora-mysql':
      case 'mariadb':
      case 'mysql':
        return this.testMysqlConnection(options);
      case 'mssql':
        return this.testMssqlConnection(options);
      case 'oracle':
        return this.testOracleConnection(options);
      case 'sqlite':
        return this.testSqliteConnection(options);
      default:
        throw new InternalServerErrorException(
          '지원하지 않는 연결 테스트 타입입니다.',
        );
    }
  }

  private async testPostgresConnection(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
  ) {
    const client = new PgClient({
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(
        options,
        'port',
        type === 'cockroach' || type === 'cockroachdb' ? 26257 : 5432,
      ),
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      database: this.getStringOption(options, 'dbname', ''),
      ssl: this.getPgSslOption(options),
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
    } finally {
      await client.end().catch(() => null);
    }
  }

  private async testMysqlConnection(options: DataSourceOptions) {
    const connection = await mysql.createConnection({
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 3306),
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'passwd', ''),
      database: this.getStringOption(options, 'db', ''),
      ssl: this.getBooleanOption(options, 'use_ssl', false) ? {} : undefined,
      connectTimeout: 5000,
    });

    try {
      await connection.query('SELECT 1');
    } finally {
      await connection.end().catch(() => null);
    }
  }

  private async testMssqlConnection(options: DataSourceOptions) {
    const pool = await mssql.connect({
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      server: this.getStringOption(options, 'server', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 1433),
      database: this.getStringOption(options, 'db', ''),
      connectionTimeout: 5000,
      requestTimeout: 5000,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });

    try {
      await pool.request().query('SELECT 1');
    } finally {
      await pool.close();
    }
  }

  private async testOracleConnection(options: DataSourceOptions) {
    const dataSource = new DataSource({
      type: 'oracle',
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 1521),
      username: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      sid: this.getOptionalStringOption(options, 'sid'),
      serviceName: this.getOptionalStringOption(options, 'serviceName'),
      synchronize: false,
      logging: false,
      entities: [],
    });

    try {
      await dataSource.initialize();
      await dataSource.query('SELECT 1 FROM dual');
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  private async testSqliteConnection(options: DataSourceOptions) {
    const database = this.getStringOption(options, 'database', '').trim();

    if (!database) {
      throw new BadRequestException('database is required.');
    }

    const dataSource = new DataSource({
      type: 'sqlite',
      database,
      synchronize: false,
      logging: false,
      entities: [],
    });

    try {
      await dataSource.initialize();
      await dataSource.query('SELECT 1');
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  private async getPostgresSchema(options: DataSourceOptions) {
    const client = new PgClient({
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 5432),
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      database: this.getStringOption(options, 'dbname', ''),
      ssl: this.getPgSslOption(options),
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();

      const columnRows = await client.query<{
        column_comment: string | null;
        column_name: string;
        data_type: string | null;
        is_foreign_key: boolean;
        is_primary_key: boolean;
        table_comment: string | null;
        table_name: string;
        table_schema: string;
      }>(`
        SELECT
          ns.nspname AS table_schema,
          cls.relname AS table_name,
          attr.attname AS column_name,
          pg_catalog.format_type(attr.atttypid, attr.atttypmod) AS data_type,
          col_description(attr.attrelid, attr.attnum) AS column_comment,
          obj_description(cls.oid, 'pg_class') AS table_comment,
          EXISTS (
            SELECT 1
            FROM pg_constraint primary_constraint
            JOIN unnest(primary_constraint.conkey) AS primary_keys(attnum) ON TRUE
            WHERE primary_constraint.conrelid = cls.oid
              AND primary_constraint.contype = 'p'
              AND primary_keys.attnum = attr.attnum
          ) AS is_primary_key,
          EXISTS (
            SELECT 1
            FROM pg_constraint foreign_constraint
            JOIN unnest(foreign_constraint.conkey) AS foreign_keys(attnum) ON TRUE
            WHERE foreign_constraint.conrelid = cls.oid
              AND foreign_constraint.contype = 'f'
              AND foreign_keys.attnum = attr.attnum
          ) AS is_foreign_key
        FROM pg_class cls
        JOIN pg_namespace ns ON ns.oid = cls.relnamespace
        JOIN pg_attribute attr ON attr.attrelid = cls.oid
        WHERE cls.relkind IN ('r', 'v', 'm', 'f', 'p')
          AND attr.attnum > 0
          AND NOT attr.attisdropped
          AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY ns.nspname ASC, cls.relname ASC, attr.attnum ASC
      `);

      const relationRows = await client.query<{
        constraint_name: string;
        position: number;
        source_is_unique: boolean;
        source_column: string;
        source_schema: string;
        source_table: string;
        target_is_unique: boolean;
        target_column: string;
        target_schema: string;
        target_table: string;
      }>(`
        SELECT
          con.conname AS constraint_name,
          source_keys.ordinality AS position,
          src_ns.nspname AS source_schema,
          src_tbl.relname AS source_table,
          src_col.attname AS source_column,
          target_ns.nspname AS target_schema,
          target_tbl.relname AS target_table,
          target_col.attname AS target_column,
          EXISTS (
            SELECT 1
            FROM pg_constraint source_unique_constraint
            WHERE source_unique_constraint.conrelid = con.conrelid
              AND source_unique_constraint.contype IN ('p', 'u')
              AND source_unique_constraint.conkey = con.conkey
          ) AS source_is_unique,
          EXISTS (
            SELECT 1
            FROM pg_constraint target_unique_constraint
            WHERE target_unique_constraint.conrelid = con.confrelid
              AND target_unique_constraint.contype IN ('p', 'u')
              AND target_unique_constraint.conkey = con.confkey
          ) AS target_is_unique
        FROM pg_constraint con
        JOIN pg_class src_tbl ON src_tbl.oid = con.conrelid
        JOIN pg_namespace src_ns ON src_ns.oid = src_tbl.relnamespace
        JOIN pg_class target_tbl ON target_tbl.oid = con.confrelid
        JOIN pg_namespace target_ns ON target_ns.oid = target_tbl.relnamespace
        JOIN unnest(con.conkey) WITH ORDINALITY AS source_keys(attnum, ordinality) ON TRUE
        JOIN unnest(con.confkey) WITH ORDINALITY AS target_keys(attnum, ordinality)
          ON target_keys.ordinality = source_keys.ordinality
        JOIN pg_attribute src_col
          ON src_col.attrelid = src_tbl.oid AND src_col.attnum = source_keys.attnum
        JOIN pg_attribute target_col
          ON target_col.attrelid = target_tbl.oid AND target_col.attnum = target_keys.attnum
        WHERE con.contype = 'f'
          AND src_ns.nspname NOT IN ('pg_catalog', 'information_schema')
          AND target_ns.nspname NOT IN ('pg_catalog', 'information_schema')
      `);

      return {
        schema: this.buildSchemaTables(
          columnRows.rows,
          (row) =>
            this.formatSchemaQualifiedName(row.table_schema, row.table_name),
          (row) => ({
            comment: row.column_comment,
            is_foreign_key: row.is_foreign_key,
            is_primary_key: row.is_primary_key,
            name: row.column_name,
            type: row.data_type,
          }),
          (row) => row.table_comment,
        ),
        has_columns: true,
        relations: relationRows.rows.map((row) => ({
          id: `${this.formatSchemaQualifiedName(
            row.source_schema,
            row.source_table,
          )}:${row.constraint_name}:${row.position}`,
          source_cardinality: this.toCardinality(row.source_is_unique),
          source_table: this.formatSchemaQualifiedName(
            row.source_schema,
            row.source_table,
          ),
          source_column: row.source_column,
          target_cardinality: this.toCardinality(row.target_is_unique),
          target_table: this.formatSchemaQualifiedName(
            row.target_schema,
            row.target_table,
          ),
          target_column: row.target_column,
        })),
      };
    } finally {
      await client.end().catch(() => null);
    }
  }

  private async getMysqlSchema(options: DataSourceOptions) {
    const currentDatabase = this.getStringOption(options, 'db', '');
    const connection = await mysql.createConnection({
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 3306),
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'passwd', ''),
      database: currentDatabase,
      ssl: this.getBooleanOption(options, 'use_ssl', false) ? {} : undefined,
      connectTimeout: 5000,
    });

    try {
      const [rawColumnRows] = await connection.query(`
        SELECT
          cols.TABLE_SCHEMA AS table_schema,
          cols.TABLE_NAME AS table_name,
          cols.COLUMN_NAME AS column_name,
          cols.COLUMN_TYPE AS data_type,
          NULLIF(cols.COLUMN_COMMENT, '') AS column_comment,
          NULLIF(tbl.TABLE_COMMENT, '') AS table_comment,
          (cols.COLUMN_KEY = 'PRI') AS is_primary_key,
          EXISTS (
            SELECT 1
            FROM information_schema.KEY_COLUMN_USAGE key_usage
            WHERE key_usage.TABLE_SCHEMA = cols.TABLE_SCHEMA
              AND key_usage.TABLE_NAME = cols.TABLE_NAME
              AND key_usage.COLUMN_NAME = cols.COLUMN_NAME
              AND key_usage.REFERENCED_TABLE_NAME IS NOT NULL
          ) AS is_foreign_key
        FROM information_schema.COLUMNS cols
        JOIN information_schema.TABLES tbl
          ON tbl.TABLE_SCHEMA = cols.TABLE_SCHEMA
         AND tbl.TABLE_NAME = cols.TABLE_NAME
        WHERE cols.TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        ORDER BY cols.TABLE_SCHEMA ASC, cols.TABLE_NAME ASC, cols.ORDINAL_POSITION ASC
      `);
      const columnRows = rawColumnRows as Array<{
        column_comment: string | null;
        column_name: string;
        data_type: string | null;
        is_foreign_key: 0 | 1;
        is_primary_key: 0 | 1;
        table_comment: string | null;
        table_name: string;
        table_schema: string;
      }>;

      const [rawRelationRows] = await connection.query(`
        SELECT
          CONSTRAINT_NAME AS constraint_name,
          TABLE_SCHEMA AS source_schema,
          TABLE_NAME AS source_table,
          COLUMN_NAME AS source_column,
          REFERENCED_TABLE_SCHEMA AS target_schema,
          REFERENCED_TABLE_NAME AS target_table,
          REFERENCED_COLUMN_NAME AS target_column,
          EXISTS (
            SELECT 1
            FROM information_schema.TABLE_CONSTRAINTS source_constraints
            WHERE source_constraints.TABLE_SCHEMA = KEY_COLUMN_USAGE.TABLE_SCHEMA
              AND source_constraints.TABLE_NAME = KEY_COLUMN_USAGE.TABLE_NAME
              AND source_constraints.CONSTRAINT_NAME = KEY_COLUMN_USAGE.CONSTRAINT_NAME
              AND source_constraints.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
          ) AS source_is_unique,
          EXISTS (
            SELECT 1
            FROM information_schema.TABLE_CONSTRAINTS target_constraints
            JOIN information_schema.REFERENTIAL_CONSTRAINTS referential_constraints
              ON referential_constraints.CONSTRAINT_SCHEMA = KEY_COLUMN_USAGE.CONSTRAINT_SCHEMA
             AND referential_constraints.CONSTRAINT_NAME = KEY_COLUMN_USAGE.CONSTRAINT_NAME
             AND target_constraints.CONSTRAINT_SCHEMA = referential_constraints.UNIQUE_CONSTRAINT_SCHEMA
             AND target_constraints.CONSTRAINT_NAME = referential_constraints.UNIQUE_CONSTRAINT_NAME
            WHERE target_constraints.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
          ) AS target_is_unique
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      const relationRows = rawRelationRows as Array<{
        constraint_name: string;
        source_is_unique: 0 | 1;
        source_column: string;
        source_schema: string;
        source_table: string;
        target_is_unique: 0 | 1;
        target_column: string;
        target_schema: string;
        target_table: string;
      }>;

      return {
        schema: this.buildSchemaTables(
          columnRows,
          (row) =>
            row.table_schema === currentDatabase
              ? row.table_name
              : this.formatSchemaQualifiedName(
                  row.table_schema,
                  row.table_name,
                ),
          (row) => ({
            comment: row.column_comment,
            is_foreign_key: Boolean(row.is_foreign_key),
            is_primary_key: Boolean(row.is_primary_key),
            name: row.column_name,
            type: row.data_type,
          }),
          (row) => row.table_comment,
        ),
        has_columns: true,
        relations: relationRows.map((row) => ({
          id: `${row.source_schema}.${row.source_table}:${row.constraint_name}:${row.source_column}:${row.target_column}`,
          source_cardinality: this.toCardinality(row.source_is_unique),
          source_table:
            row.source_schema === currentDatabase
              ? row.source_table
              : this.formatSchemaQualifiedName(
                  row.source_schema,
                  row.source_table,
                ),
          source_column: row.source_column,
          target_cardinality: this.toCardinality(row.target_is_unique),
          target_table:
            row.target_schema === currentDatabase
              ? row.target_table
              : this.formatSchemaQualifiedName(
                  row.target_schema,
                  row.target_table,
                ),
          target_column: row.target_column,
        })),
      };
    } finally {
      await connection.end().catch(() => null);
    }
  }

  private async getMssqlSchema(options: DataSourceOptions) {
    const databaseName = this.getStringOption(options, 'db', '');
    const pool = await mssql.connect({
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      server: this.getStringOption(options, 'server', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 1433),
      database: databaseName,
      connectionTimeout: 5000,
      requestTimeout: 5000,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });

    try {
      const columnRows = await pool.request().query<{
        column_comment: string | null;
        column_name: string;
        data_type: string | null;
        is_foreign_key: boolean;
        is_primary_key: boolean;
        table_comment: string | null;
        table_name: string;
        table_schema: string;
      }>(`
        SELECT
          cols.TABLE_SCHEMA AS table_schema,
          cols.TABLE_NAME AS table_name,
          cols.COLUMN_NAME AS column_name,
          cols.DATA_TYPE AS data_type,
          CAST(column_description.value AS nvarchar(4000)) AS column_comment,
          CAST(table_description.value AS nvarchar(4000)) AS table_comment,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM sys.indexes primary_indexes
              JOIN sys.index_columns primary_index_columns
                ON primary_index_columns.object_id = primary_indexes.object_id
               AND primary_index_columns.index_id = primary_indexes.index_id
              WHERE primary_indexes.object_id = objects.object_id
                AND primary_indexes.is_primary_key = 1
                AND primary_index_columns.column_id = sys_columns.column_id
            ) THEN CAST(1 AS bit)
            ELSE CAST(0 AS bit)
          END AS is_primary_key,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM sys.foreign_key_columns foreign_key_columns
              WHERE foreign_key_columns.parent_object_id = objects.object_id
                AND foreign_key_columns.parent_column_id = sys_columns.column_id
            ) THEN CAST(1 AS bit)
            ELSE CAST(0 AS bit)
          END AS is_foreign_key
        FROM INFORMATION_SCHEMA.COLUMNS cols
        JOIN INFORMATION_SCHEMA.TABLES tbl
          ON tbl.TABLE_SCHEMA = cols.TABLE_SCHEMA
         AND tbl.TABLE_NAME = cols.TABLE_NAME
         AND tbl.TABLE_TYPE = 'BASE TABLE'
        JOIN sys.schemas schemas ON schemas.name = cols.TABLE_SCHEMA
        JOIN sys.objects objects
          ON objects.name = cols.TABLE_NAME
         AND objects.schema_id = schemas.schema_id
        JOIN sys.columns sys_columns
          ON sys_columns.object_id = objects.object_id
         AND sys_columns.name = cols.COLUMN_NAME
        LEFT JOIN sys.extended_properties column_description
          ON column_description.major_id = sys_columns.object_id
         AND column_description.minor_id = sys_columns.column_id
         AND column_description.name = 'MS_Description'
        LEFT JOIN sys.extended_properties table_description
          ON table_description.major_id = objects.object_id
         AND table_description.minor_id = 0
         AND table_description.name = 'MS_Description'
        WHERE cols.TABLE_SCHEMA NOT IN (
          'guest','INFORMATION_SCHEMA','sys','db_owner','db_accessadmin',
          'db_securityadmin','db_ddladmin','db_backupoperator','db_datareader',
          'db_datawriter','db_denydatareader','db_denydatawriter'
        )
        ORDER BY cols.TABLE_SCHEMA ASC, cols.TABLE_NAME ASC, cols.ORDINAL_POSITION ASC
      `);

      const relationRows = await pool.request().query<{
        constraint_name: string;
        position: number;
        source_is_unique: boolean;
        source_column: string;
        source_schema: string;
        source_table: string;
        target_is_unique: boolean;
        target_column: string;
        target_schema: string;
        target_table: string;
      }>(`
        SELECT
          foreign_keys.name AS constraint_name,
          foreign_key_columns.constraint_column_id AS position,
          source_schema.name AS source_schema,
          source_table.name AS source_table,
          source_column.name AS source_column,
          target_schema.name AS target_schema,
          target_table.name AS target_table,
          target_column.name AS target_column,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM sys.indexes source_indexes
              JOIN sys.index_columns source_index_columns
                ON source_index_columns.object_id = source_indexes.object_id
               AND source_index_columns.index_id = source_indexes.index_id
              WHERE source_indexes.object_id = foreign_key_columns.parent_object_id
                AND source_indexes.is_unique = 1
                AND source_index_columns.column_id = foreign_key_columns.parent_column_id
            ) THEN CAST(1 AS bit)
            ELSE CAST(0 AS bit)
          END AS source_is_unique,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM sys.indexes target_indexes
              JOIN sys.index_columns target_index_columns
                ON target_index_columns.object_id = target_indexes.object_id
               AND target_index_columns.index_id = target_indexes.index_id
              WHERE target_indexes.object_id = foreign_key_columns.referenced_object_id
                AND target_indexes.is_unique = 1
                AND target_index_columns.column_id = foreign_key_columns.referenced_column_id
            ) THEN CAST(1 AS bit)
            ELSE CAST(0 AS bit)
          END AS target_is_unique
        FROM sys.foreign_key_columns foreign_key_columns
        JOIN sys.foreign_keys foreign_keys
          ON foreign_keys.object_id = foreign_key_columns.constraint_object_id
        JOIN sys.tables source_table
          ON source_table.object_id = foreign_key_columns.parent_object_id
        JOIN sys.schemas source_schema
          ON source_schema.schema_id = source_table.schema_id
        JOIN sys.columns source_column
          ON source_column.object_id = foreign_key_columns.parent_object_id
         AND source_column.column_id = foreign_key_columns.parent_column_id
        JOIN sys.tables target_table
          ON target_table.object_id = foreign_key_columns.referenced_object_id
        JOIN sys.schemas target_schema
          ON target_schema.schema_id = target_table.schema_id
        JOIN sys.columns target_column
          ON target_column.object_id = foreign_key_columns.referenced_object_id
         AND target_column.column_id = foreign_key_columns.referenced_column_id
      `);

      return {
        schema: this.buildSchemaTables(
          columnRows.recordset,
          (row) =>
            row.table_schema === 'dbo'
              ? row.table_name
              : this.formatSchemaQualifiedName(
                  row.table_schema,
                  row.table_name,
                ),
          (row) => ({
            comment: row.column_comment,
            is_foreign_key: row.is_foreign_key,
            is_primary_key: row.is_primary_key,
            name: row.column_name,
            type: row.data_type,
          }),
          (row) => row.table_comment,
        ),
        has_columns: true,
        relations: relationRows.recordset.map((row) => ({
          id: `${row.source_schema}.${row.source_table}:${row.constraint_name}:${row.position}`,
          source_cardinality: this.toCardinality(row.source_is_unique),
          source_table:
            row.source_schema === 'dbo'
              ? row.source_table
              : this.formatSchemaQualifiedName(
                  row.source_schema,
                  row.source_table,
                ),
          source_column: row.source_column,
          target_cardinality: this.toCardinality(row.target_is_unique),
          target_table:
            row.target_schema === 'dbo'
              ? row.target_table
              : this.formatSchemaQualifiedName(
                  row.target_schema,
                  row.target_table,
                ),
          target_column: row.target_column,
        })),
      };
    } finally {
      await pool.close();
    }
  }

  private async getOracleSchema(options: DataSourceOptions) {
    const dataSource = new DataSource({
      type: 'oracle',
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 1521),
      username: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      sid: this.getOptionalStringOption(options, 'sid'),
      serviceName: this.getOptionalStringOption(options, 'serviceName'),
      synchronize: false,
      logging: false,
      entities: [],
    });

    try {
      await dataSource.initialize();

      const columnRows: Array<{
        COLUMN_COMMENT?: string | null;
        COLUMN_NAME: string;
        DATA_TYPE?: string | null;
        IS_FOREIGN_KEY?: number | string | null;
        IS_PRIMARY_KEY?: number | string | null;
        TABLE_COMMENT?: string | null;
        TABLE_NAME: string;
        TABLE_SCHEMA: string;
      }> = await dataSource.query(`
        SELECT
          cols.OWNER AS table_schema,
          cols.TABLE_NAME AS table_name,
          cols.COLUMN_NAME AS column_name,
          cols.DATA_TYPE AS data_type,
          comments.COMMENTS AS column_comment,
          table_comments.COMMENTS AS table_comment,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM ALL_CONSTRAINTS primary_constraints
              JOIN ALL_CONS_COLUMNS primary_columns
                ON primary_columns.OWNER = primary_constraints.OWNER
               AND primary_columns.CONSTRAINT_NAME = primary_constraints.CONSTRAINT_NAME
              WHERE primary_constraints.CONSTRAINT_TYPE = 'P'
                AND primary_constraints.OWNER = cols.OWNER
                AND primary_columns.TABLE_NAME = cols.TABLE_NAME
                AND primary_columns.COLUMN_NAME = cols.COLUMN_NAME
            ) THEN 1
            ELSE 0
          END AS is_primary_key,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM ALL_CONSTRAINTS foreign_constraints
              JOIN ALL_CONS_COLUMNS foreign_columns
                ON foreign_columns.OWNER = foreign_constraints.OWNER
               AND foreign_columns.CONSTRAINT_NAME = foreign_constraints.CONSTRAINT_NAME
              WHERE foreign_constraints.CONSTRAINT_TYPE = 'R'
                AND foreign_constraints.OWNER = cols.OWNER
                AND foreign_columns.TABLE_NAME = cols.TABLE_NAME
                AND foreign_columns.COLUMN_NAME = cols.COLUMN_NAME
            ) THEN 1
            ELSE 0
          END AS is_foreign_key
        FROM ALL_TAB_COLUMNS cols
        LEFT JOIN ALL_COL_COMMENTS comments
          ON comments.OWNER = cols.OWNER
         AND comments.TABLE_NAME = cols.TABLE_NAME
         AND comments.COLUMN_NAME = cols.COLUMN_NAME
        LEFT JOIN ALL_TAB_COMMENTS table_comments
          ON table_comments.OWNER = cols.OWNER
         AND table_comments.TABLE_NAME = cols.TABLE_NAME
        WHERE cols.OWNER NOT IN (
          'SYS','SYSTEM','ORDSYS','CTXSYS','WMSYS','MDSYS','ORDDATA','XDB',
          'OUTLN','DMSYS','DSSYS','EXFSYS','LBACSYS','TSMSYS'
        )
        ORDER BY cols.OWNER ASC, cols.TABLE_NAME ASC, cols.COLUMN_ID ASC
      `);

      const relationRows: Array<{
        CONSTRAINT_NAME: string;
        POSITION: number;
        SOURCE_IS_UNIQUE?: number | string | null;
        SOURCE_COLUMN: string;
        SOURCE_SCHEMA: string;
        SOURCE_TABLE: string;
        TARGET_IS_UNIQUE?: number | string | null;
        TARGET_COLUMN: string;
        TARGET_SCHEMA: string;
        TARGET_TABLE: string;
      }> = await dataSource.query(`
        SELECT
          source_constraints.CONSTRAINT_NAME AS constraint_name,
          source_cols.POSITION AS position,
          source_cols.OWNER AS source_schema,
          source_cols.TABLE_NAME AS source_table,
          source_cols.COLUMN_NAME AS source_column,
          target_cols.OWNER AS target_schema,
          target_cols.TABLE_NAME AS target_table,
          target_cols.COLUMN_NAME AS target_column,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM ALL_CONSTRAINTS source_unique_constraints
              JOIN ALL_CONS_COLUMNS source_unique_columns
                ON source_unique_columns.OWNER = source_unique_constraints.OWNER
               AND source_unique_columns.CONSTRAINT_NAME = source_unique_constraints.CONSTRAINT_NAME
              WHERE source_unique_constraints.CONSTRAINT_TYPE IN ('P', 'U')
                AND source_unique_constraints.OWNER = source_constraints.OWNER
                AND source_unique_columns.TABLE_NAME = source_cols.TABLE_NAME
                AND source_unique_columns.COLUMN_NAME = source_cols.COLUMN_NAME
            ) THEN 1
            ELSE 0
          END AS source_is_unique,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM ALL_CONSTRAINTS target_unique_constraints
              JOIN ALL_CONS_COLUMNS target_unique_columns
                ON target_unique_columns.OWNER = target_unique_constraints.OWNER
               AND target_unique_columns.CONSTRAINT_NAME = target_unique_constraints.CONSTRAINT_NAME
              WHERE target_unique_constraints.CONSTRAINT_TYPE IN ('P', 'U')
                AND target_unique_constraints.OWNER = target_constraints.OWNER
                AND target_unique_columns.TABLE_NAME = target_cols.TABLE_NAME
                AND target_unique_columns.COLUMN_NAME = target_cols.COLUMN_NAME
            ) THEN 1
            ELSE 0
          END AS target_is_unique
        FROM ALL_CONSTRAINTS source_constraints
        JOIN ALL_CONS_COLUMNS source_cols
          ON source_cols.OWNER = source_constraints.OWNER
         AND source_cols.CONSTRAINT_NAME = source_constraints.CONSTRAINT_NAME
        JOIN ALL_CONSTRAINTS target_constraints
          ON target_constraints.OWNER = source_constraints.R_OWNER
         AND target_constraints.CONSTRAINT_NAME = source_constraints.R_CONSTRAINT_NAME
        JOIN ALL_CONS_COLUMNS target_cols
          ON target_cols.OWNER = target_constraints.OWNER
         AND target_cols.CONSTRAINT_NAME = target_constraints.CONSTRAINT_NAME
          AND target_cols.POSITION = source_cols.POSITION
        WHERE source_constraints.CONSTRAINT_TYPE = 'R'
      `);

      return {
        schema: this.buildSchemaTables(
          columnRows,
          (row) =>
            this.formatSchemaQualifiedName(row.TABLE_SCHEMA, row.TABLE_NAME),
          (row) => ({
            comment: row.COLUMN_COMMENT ?? null,
            is_foreign_key: this.toCardinality(row.IS_FOREIGN_KEY) === 'one',
            is_primary_key: this.toCardinality(row.IS_PRIMARY_KEY) === 'one',
            name: row.COLUMN_NAME,
            type: row.DATA_TYPE ?? null,
          }),
          (row) => row.TABLE_COMMENT ?? null,
        ),
        has_columns: true,
        relations: relationRows.map((row) => ({
          id: `${row.SOURCE_SCHEMA}.${row.SOURCE_TABLE}:${row.CONSTRAINT_NAME}:${row.POSITION}`,
          source_cardinality: this.toCardinality(row.SOURCE_IS_UNIQUE),
          source_table: this.formatSchemaQualifiedName(
            row.SOURCE_SCHEMA,
            row.SOURCE_TABLE,
          ),
          source_column: row.SOURCE_COLUMN,
          target_cardinality: this.toCardinality(row.TARGET_IS_UNIQUE),
          target_table: this.formatSchemaQualifiedName(
            row.TARGET_SCHEMA,
            row.TARGET_TABLE,
          ),
          target_column: row.TARGET_COLUMN,
        })),
      };
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  private async getSqliteSchema(options: DataSourceOptions) {
    const database = this.getStringOption(options, 'database', '').trim();

    if (!database) {
      throw new BadRequestException('database is required.');
    }

    const dataSource = new DataSource({
      type: 'sqlite',
      database,
      synchronize: false,
      logging: false,
      entities: [],
    });

    try {
      await dataSource.initialize();
      const tableRows: Array<{ name: string }> = await dataSource.query(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC
      `);

      const schema: DataSourceSchemaTable[] = [];
      const relations: DataSourceSchemaRelation[] = [];

      for (const tableRow of tableRows) {
        const tableName = tableRow.name;
        const columnRows: Array<{
          name: string;
          pk: number;
          type: string | null;
        }> = await dataSource.query(
          `PRAGMA table_info("${tableName.replace(/"/g, '""')}")`,
        );
        const relationRows: Array<{
          from: string;
          id: number;
          seq: number;
          table: string;
          to: string;
        }> = await dataSource.query(
          `PRAGMA foreign_key_list("${tableName.replace(/"/g, '""')}")`,
        );

        schema.push({
          name: tableName,
          comment: null,
          columns: columnRows.map((row) => ({
            comment: null,
            is_foreign_key: relationRows.some(
              (relationRow) => relationRow.from === row.name,
            ),
            is_primary_key: row.pk > 0,
            name: row.name,
            type: row.type,
          })),
        });

        relations.push(
          ...relationRows.map((row) => ({
            id: `${tableName}:${row.id}:${row.seq}`,
            source_cardinality: 'many' as const,
            source_table: tableName,
            source_column: row.from,
            target_cardinality: 'one' as const,
            target_table: row.table,
            target_column: row.to,
          })),
        );
      }

      return {
        schema,
        has_columns: true,
        relations,
      };
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  private buildSchemaTables<RowType>(
    rows: RowType[],
    getTableName: (row: RowType) => string,
    getColumn: (row: RowType) => DataSourceSchemaColumn,
    getTableComment: (row: RowType) => string | null,
  ) {
    const tables = new Map<string, DataSourceSchemaTable>();

    for (const row of rows) {
      const tableName = getTableName(row);
      const existing: DataSourceSchemaTable = tables.get(tableName) ?? {
        name: tableName,
        comment: getTableComment(row),
        columns: [],
      };

      existing.columns.push(getColumn(row));
      if (existing.comment === null) {
        existing.comment = getTableComment(row);
      }
      tables.set(tableName, existing);
    }

    return Array.from(tables.values());
  }

  private formatSchemaQualifiedName(schema: string, table: string) {
    if (!schema || schema === 'public') {
      return table;
    }

    return `${schema}.${table}`;
  }

  private getPgSslOption(options: DataSourceOptions) {
    return resolvePostgresSslOption(
      this.getStringOption(options, 'host', '127.0.0.1'),
    );
  }

  private getStringOption(
    options: DataSourceOptions,
    key: string,
    defaultValue: string,
  ) {
    const value = options[key];

    if (typeof value === 'string') {
      return value;
    }

    return defaultValue;
  }

  private getOptionalStringOption(options: DataSourceOptions, key: string) {
    const value = options[key];

    if (typeof value === 'string') {
      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    }

    return undefined;
  }

  private getNumberOption(
    options: DataSourceOptions,
    key: string,
    defaultValue: number,
  ) {
    const value = options[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const nextValue = Number(value);
      if (Number.isFinite(nextValue)) {
        return nextValue;
      }
    }

    return defaultValue;
  }

  private getBooleanOption(
    options: DataSourceOptions,
    key: string,
    defaultValue: boolean,
  ) {
    const value = options[key];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true';
    }

    return defaultValue;
  }

  private toCardinality(
    value: boolean | number | string | null | undefined,
  ): 'many' | 'one' {
    if (typeof value === 'boolean') {
      return value ? 'one' : 'many';
    }

    if (typeof value === 'number') {
      return value === 1 ? 'one' : 'many';
    }

    if (typeof value === 'string') {
      return value === '1' || value.toLowerCase() === 'true' ? 'one' : 'many';
    }

    return 'many';
  }
}
