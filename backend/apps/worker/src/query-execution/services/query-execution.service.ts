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
  normalizeEncryptedPayload,
} from '@app/common/utils/crypto.util';
import type { QueryExecutionJobPayload } from '@app/common/queue/queue.constants';
import { normalizeQueryLimit } from '@app/common/query/query-limit.util';
import { resolvePostgresSslOption } from '@app/database/postgres-ssl.util';
import {
  getDataSourceTypeDefinition,
  type SupportedDataSourceType,
} from '../../../../api/src/data-source/data-source.constants';
import { WorkerQueryRepository } from '../repositories/worker-query.repository';
import {
  mapMssqlColumnType,
  mapMysqlColumnType,
  mapPostgresColumnType,
} from '../utils/query-result-column-type.util';

type DataSourceOptions = Record<string, unknown>;

@Injectable()
export class QueryExecutionService {
  constructor(private readonly workerQueryRepository: WorkerQueryRepository) {}

  async execute(payload: QueryExecutionJobPayload) {
    const normalizedQueryLimit = normalizeQueryLimit(payload.queryText.trim());
    const queryText = normalizedQueryLimit.query;

    if (!queryText) {
      throw new BadRequestException("Can't execute empty query.");
    }

    const dataSource = await this.workerQueryRepository.getDataSourceOrThrow(
      payload.orgId,
      payload.dataSourceId,
    );
    const definition = getDataSourceTypeDefinition(dataSource.type);

    if (!definition) {
      throw new InternalServerErrorException(
        '지원하지 않는 데이터 소스 타입입니다.',
      );
    }

    const options = this.parseOptions(dataSource.encryptedOptions);
    const startedAt = Date.now();
    const result = await this.executeAgainstDataSourceSafely(
      definition.type,
      options,
      queryText,
    );
    const runtime = Number(((Date.now() - startedAt) / 1000).toFixed(3));

    return this.workerQueryRepository.storeExecutionResult({
      data: {
        columns: result.columns,
        limit: {
          applied_limit: normalizedQueryLimit.appliedLimit,
          did_apply_default_limit: normalizedQueryLimit.didApplyDefaultLimit,
          did_cap_limit: normalizedQueryLimit.didCapLimit,
          requested_limit: normalizedQueryLimit.requestedLimit,
        },
        rows: result.rows,
        truncated: false,
      },
      dataSourceId: dataSource.id,
      orgId: payload.orgId,
      persistLatestQueryData: payload.persistLatestQueryData,
      queryId: payload.queryId,
      queryText,
      runtime,
    });
  }

  private async executeAgainstDataSource(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
    queryText: string,
  ) {
    switch (type) {
      case 'aurora-postgres':
      case 'cockroach':
      case 'cockroachdb':
      case 'pg':
        return this.executePostgresQuery(type, options, queryText);
      case 'aurora-mysql':
      case 'mariadb':
      case 'mysql':
        return this.executeMysqlQuery(options, queryText);
      case 'mssql':
        return this.executeMssqlQuery(options, queryText);
      case 'oracle':
        return this.executeOracleQuery(options, queryText);
      case 'sqlite':
        return this.executeSqliteQuery(options, queryText);
      default:
        throw new InternalServerErrorException(
          '지원하지 않는 데이터 소스 타입입니다.',
        );
    }
  }

  private async executeAgainstDataSourceSafely(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
    queryText: string,
  ) {
    try {
      return await this.executeAgainstDataSource(type, options, queryText);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '쿼리 실행에 실패했습니다.';

      throw new BadRequestException(message);
    }
  }

  private async executePostgresQuery(
    type: SupportedDataSourceType,
    options: DataSourceOptions,
    queryText: string,
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
      ssl: resolvePostgresSslOption(
        this.getStringOption(options, 'host', '127.0.0.1'),
      ),
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      const result = await client.query(queryText);

      return {
        columns: result.fields.map((field) => ({
          friendly_name: field.name,
          name: field.name,
          type: mapPostgresColumnType(field.dataTypeID),
        })),
        rows: result.rows as Array<Record<string, unknown>>,
      };
    } finally {
      await client.end().catch(() => null);
    }
  }

  private async executeMysqlQuery(
    options: DataSourceOptions,
    queryText: string,
  ) {
    const connection = await mysql.createConnection({
      host: this.getStringOption(options, 'host', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 3306),
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'passwd', ''),
      database: this.getStringOption(options, 'db', ''),
      ssl: this.getBooleanOption(options, 'use_ssl', false) ? {} : undefined,
      connectTimeout: 10000,
    });

    try {
      const [rows, fields] = await connection.query(queryText);
      const normalizedRows = Array.isArray(rows)
        ? (rows as Array<Record<string, unknown>>)
        : [];

      return {
        columns: (fields ?? []).map((field) => ({
          friendly_name: field.name,
          name: field.name,
          type: mapMysqlColumnType(field.columnType),
        })),
        rows: normalizedRows,
      };
    } finally {
      await connection.end().catch(() => null);
    }
  }

  private async executeMssqlQuery(
    options: DataSourceOptions,
    queryText: string,
  ) {
    const pool = await mssql.connect({
      user: this.getStringOption(options, 'user', ''),
      password: this.getStringOption(options, 'password', ''),
      server: this.getStringOption(options, 'server', '127.0.0.1'),
      port: this.getNumberOption(options, 'port', 1433),
      database: this.getStringOption(options, 'db', ''),
      connectionTimeout: 10000,
      requestTimeout: 10000,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });

    try {
      const result = await pool.request().query(queryText);
      const recordset = result.recordset as Array<Record<string, unknown>> & {
        columns?: Record<string, unknown>;
      };
      const rows = recordset as Array<Record<string, unknown>>;

      return {
        columns: this.buildMssqlColumns(rows, recordset.columns),
        rows,
      };
    } finally {
      await pool.close();
    }
  }

  private async executeOracleQuery(
    options: DataSourceOptions,
    queryText: string,
  ) {
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
      const rows: Array<Record<string, unknown>> =
        await dataSource.query(queryText);
      const firstRow = rows[0] ?? {};

      return {
        columns: Object.keys(firstRow).map((name) => ({
          friendly_name: name,
          name,
          type: null,
        })),
        rows,
      };
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  private async executeSqliteQuery(
    options: DataSourceOptions,
    queryText: string,
  ) {
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
      const rows: Array<Record<string, unknown>> =
        await dataSource.query(queryText);
      const firstRow = rows[0] ?? {};

      return {
        columns: Object.keys(firstRow).map((name) => ({
          friendly_name: name,
          name,
          type: null,
        })),
        rows,
      };
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => null);
      }
    }
  }

  private parseOptions(
    value: string | Buffer | null | undefined,
  ): DataSourceOptions {
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
      const decrypted = decryptJsonValue<DataSourceOptions>(normalizedValue);

      if (decrypted) {
        return decrypted;
      }
    }

    return {};
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

  private buildMssqlColumns(
    rows: Array<Record<string, unknown>>,
    columnsMetadata: Record<string, unknown> | undefined,
  ) {
    const metadataColumns = Object.values(columnsMetadata ?? {})
      .filter(
        (
          column,
        ): column is {
          index?: number;
          name: string;
          type?: unknown;
        } =>
          !!column &&
          typeof column === 'object' &&
          'name' in column &&
          typeof (column as { name?: unknown }).name === 'string',
      )
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0));

    if (metadataColumns.length > 0) {
      return metadataColumns.map((column) => ({
        friendly_name: column.name,
        name: column.name,
        type: mapMssqlColumnType(column.type),
      }));
    }

    const firstRow = rows[0] ?? {};

    return Object.keys(firstRow).map((name) => ({
      friendly_name: name,
      name,
      type: null,
    }));
  }
}
