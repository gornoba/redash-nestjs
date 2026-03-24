import {
  buildArchivedQueryDetailResponse,
  buildQueryListLatestQueryDataSummaryByQueryId,
  canEditOwnedQuery,
  canForkQuery,
  canPersistLatestQueryData,
  canScheduleOwnedQuery,
  canViewDraftQuery,
  getQueryListOrderDefinition,
  isAdminUser,
} from './query.repository';

describe('getQueryListOrderDefinition', () => {
  it('returns an aliased lowercase expression for name ordering', () => {
    expect(getQueryListOrderDefinition('name')).toEqual({
      alias: 'query_order_name',
      orderBy: 'query_order_name',
      select: 'LOWER(query.name)',
    });
  });

  it('returns an aliased interval expression for schedule ordering', () => {
    expect(getQueryListOrderDefinition('schedule')).toEqual({
      alias: 'query_order_schedule',
      orderBy: 'query_order_schedule',
      select: "COALESCE((query.schedule::jsonb ->> 'interval')::int, 0)",
    });
  });
});

describe('draft visibility helpers', () => {
  it('treats admin users as draft viewers for every query', () => {
    expect(
      canViewDraftQuery(
        {
          id: 7,
          roles: ['admin'],
        },
        999,
      ),
    ).toBe(true);
  });

  it('allows the owner to view their own draft query', () => {
    expect(
      canViewDraftQuery(
        {
          id: 42,
          roles: ['user'],
        },
        42,
      ),
    ).toBe(true);
  });

  it('blocks non-admin users from other users draft queries', () => {
    expect(
      canViewDraftQuery(
        {
          id: 42,
          roles: ['user'],
        },
        99,
      ),
    ).toBe(false);
  });

  it('detects admin role from the authenticated user context', () => {
    expect(isAdminUser({ roles: ['admin'] })).toBe(true);
    expect(isAdminUser({ roles: ['user'] })).toBe(false);
  });
});

describe('query mutation permission helpers', () => {
  it('allows edit only for admin or owner with edit_query', () => {
    expect(
      canEditOwnedQuery(
        {
          id: 8,
          permissions: ['edit_query'],
          roles: ['user'],
        },
        8,
      ),
    ).toBe(true);
    expect(
      canEditOwnedQuery(
        {
          id: 8,
          permissions: ['edit_query'],
          roles: ['user'],
        },
        99,
      ),
    ).toBe(false);
    expect(
      canEditOwnedQuery(
        {
          id: 8,
          permissions: [],
          roles: ['admin'],
        },
        99,
      ),
    ).toBe(true);
  });

  it('allows schedule updates only for admin or owner with schedule_query', () => {
    expect(
      canScheduleOwnedQuery(
        {
          id: 8,
          permissions: ['schedule_query'],
          roles: ['user'],
        },
        8,
      ),
    ).toBe(true);
    expect(
      canScheduleOwnedQuery(
        {
          id: 8,
          permissions: ['schedule_query'],
          roles: ['user'],
        },
        12,
      ),
    ).toBe(false);
  });

  it('allows fork for admin or create_query permission holders', () => {
    expect(
      canForkQuery({
        permissions: ['create_query'],
        roles: ['user'],
      }),
    ).toBe(true);
    expect(
      canForkQuery({
        permissions: [],
        roles: ['admin'],
      }),
    ).toBe(true);
    expect(
      canForkQuery({
        permissions: ['edit_query'],
        roles: ['user'],
      }),
    ).toBe(false);
  });

  it('allows latest result persistence only for owner or admin', () => {
    expect(
      canPersistLatestQueryData(
        {
          id: 8,
          roles: ['user'],
        },
        8,
      ),
    ).toBe(true);
    expect(
      canPersistLatestQueryData(
        {
          id: 8,
          roles: ['user'],
        },
        12,
      ),
    ).toBe(false);
    expect(
      canPersistLatestQueryData(
        {
          id: 8,
          roles: ['admin'],
        },
        12,
      ),
    ).toBe(true);
  });
});

describe('buildQueryListLatestQueryDataSummaryByQueryId', () => {
  it('normalizes raw query list metadata into a per-query lookup map', () => {
    const summaries = buildQueryListLatestQueryDataSummaryByQueryId([
      {
        query_id: '7',
        latest_query_data_retrieved_at: new Date('2026-03-17T07:50:07.237Z'),
        latest_query_data_runtime: '3.243',
      },
      {
        query_id: 8,
        latest_query_data_retrieved_at: null,
        latest_query_data_runtime: 0.207,
      },
    ]);

    expect(summaries.get(7)).toEqual({
      retrievedAt: '2026-03-17T07:50:07.237Z',
      runtime: 3.243,
    });
    expect(summaries.get(8)).toEqual({
      retrievedAt: null,
      runtime: 0.207,
    });
  });

  it('skips malformed query ids and invalid summary values', () => {
    const summaries = buildQueryListLatestQueryDataSummaryByQueryId([
      {
        query_id: 'abc',
        latest_query_data_retrieved_at: '2026-03-17T07:50:07.237Z',
        latest_query_data_runtime: '1.2',
      },
      {
        query_id: 9,
        latest_query_data_retrieved_at: undefined,
        latest_query_data_runtime: 'not-a-number',
      },
    ]);

    expect(summaries.has(0)).toBe(false);
    expect(summaries.get(9)).toEqual({
      retrievedAt: null,
      runtime: null,
    });
  });
});

describe('buildArchivedQueryDetailResponse', () => {
  it('overrides archive-specific fields without dropping the rest of the payload', () => {
    expect(
      buildArchivedQueryDetailResponse(
        {
          id: 553,
          is_archived: false,
          last_modified_by_id: 1,
          name: 'codex-delete',
          schedule: {
            interval: 60,
          },
          updated_at: '2026-03-23T01:00:00.000Z',
          version: 1,
        },
        {
          lastModifiedById: 7,
          updatedAt: new Date('2026-03-23T01:05:00.000Z'),
          version: 2,
        },
      ),
    ).toEqual({
      id: 553,
      is_archived: true,
      last_modified_by_id: 7,
      name: 'codex-delete',
      schedule: null,
      updated_at: '2026-03-23T01:05:00.000Z',
      version: 2,
    });
  });
});
