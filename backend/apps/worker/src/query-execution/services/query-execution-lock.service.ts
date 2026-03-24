import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';

import { applyDefaultQueryLimit } from '@app/common/query/query-limit.util';
import { QUERY_EXECUTION_QUEUE } from '@app/common/queue/queue.constants';

@Injectable()
export class QueryExecutionLockService {
  constructor(
    @InjectQueue(QUERY_EXECUTION_QUEUE)
    private readonly queryExecutionQueue: Queue,
  ) {}

  buildLockKey(dataSourceId: number, queryText: string) {
    const normalizedQueryText = applyDefaultQueryLimit(queryText.trim());
    const hash = createHash('sha256')
      .update(normalizedQueryText, 'utf8')
      .digest('hex');

    return `query-execution-lock:${dataSourceId}:${hash}`;
  }

  async acquire(lockKey: string, owner: string, ttlMs = 60_000) {
    const client = await this.queryExecutionQueue.client;
    const result = await client.set(lockKey, owner, 'PX', ttlMs, 'NX');

    return result === 'OK';
  }

  async release(lockKey: string, owner: string) {
    const client = await this.queryExecutionQueue.client;

    await client.eval(
      `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        end

        return 0
      `,
      1,
      lockKey,
      owner,
    );
  }
}
