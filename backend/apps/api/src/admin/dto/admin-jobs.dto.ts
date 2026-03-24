import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const adminJobMetaSchema = z.object({
  data_source_id: z.number().int().nullable().optional(),
  org_id: z.number().int().nullable().optional(),
  query_id: z.number().int().nullable().optional(),
  scheduled: z.boolean().optional(),
  user_id: z.number().int().nullable().optional(),
});

const adminStartedJobSchema = z.object({
  enqueued_at: z.string().nullable(),
  id: z.string(),
  meta: adminJobMetaSchema,
  name: z.string(),
  origin: z.string(),
  started_at: z.string().nullable(),
});

const adminQueueStatusSchema = z.object({
  name: z.string(),
  queued: z.number().int().nonnegative(),
  started: z.array(adminStartedJobSchema),
});

const adminWorkerStatusSchema = z.object({
  birth_date: z.string(),
  current_job: z.string().nullable(),
  failed_jobs: z.number().int().nonnegative(),
  hostname: z.string(),
  name: z.string(),
  pid: z.number().int().nonnegative(),
  queues: z.string(),
  state: z.string(),
  successful_jobs: z.number().int().nonnegative(),
  total_working_time: z.number().int().nonnegative(),
});

export const adminJobsResponseSchema = z.object({
  queues: z.record(z.string(), adminQueueStatusSchema),
  workers: z.array(adminWorkerStatusSchema),
});

export class AdminJobsResponseDto extends createZodDto(
  adminJobsResponseSchema,
) {}
