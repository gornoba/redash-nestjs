import { dashboardDetailResponseSchema } from './dashboard-detail-response.dto';

describe('dashboardDetailResponseSchema', () => {
  it('레거시 widget query result data 에 truncated 가 없어도 직렬화 가능해야 한다', () => {
    expect(
      dashboardDetailResponseSchema.parse({
        id: 20,
        slug: '-api-log',
        url: '/dashboards/20--api-log',
        name: '스마트api log',
        user_id: 1,
        user: {
          id: 1,
          name: 'admin',
          email: 'admin@example.com',
          profile_image_url: '',
        },
        layout: [],
        dashboard_filters_enabled: false,
        options: {},
        is_archived: false,
        is_draft: false,
        updated_at: '2026-03-23T00:00:00.000Z',
        created_at: '2026-03-23T00:00:00.000Z',
        version: 1,
        is_favorite: false,
        tags: [],
        widgets: [
          {
            id: 35,
            width: 1,
            options: {},
            text: '',
            updated_at: '2026-03-23T00:00:00.000Z',
            created_at: '2026-03-23T00:00:00.000Z',
            visualization: {
              id: 223,
              type: 'PIVOT',
              query_id: 214,
              query_name: '위다이트스마트api log',
              name: 'Pivot Table',
              description: '',
              options: {},
            },
            query_result: {
              id: 1127129,
              data_source_id: 25,
              query: 'select 1',
              data: {
                columns: [
                  {
                    friendly_name: 'company',
                    name: 'company',
                    type: 'string',
                  },
                ],
                rows: [
                  {
                    company: 'meta',
                  },
                ],
              },
              runtime: 0.123,
              retrieved_at: '2026-03-23T00:00:00.000Z',
            },
          },
        ],
      }),
    ).toEqual({
      id: 20,
      slug: '-api-log',
      url: '/dashboards/20--api-log',
      name: '스마트api log',
      user_id: 1,
      user: {
        id: 1,
        name: 'admin',
        email: 'admin@example.com',
        profile_image_url: '',
      },
      layout: [],
      dashboard_filters_enabled: false,
      options: {},
      is_archived: false,
      is_draft: false,
      updated_at: '2026-03-23T00:00:00.000Z',
      created_at: '2026-03-23T00:00:00.000Z',
      version: 1,
      is_favorite: false,
      tags: [],
      widgets: [
        {
          id: 35,
          width: 1,
          options: {},
          text: '',
          updated_at: '2026-03-23T00:00:00.000Z',
          created_at: '2026-03-23T00:00:00.000Z',
          visualization: {
            id: 223,
            type: 'PIVOT',
            query_id: 214,
            query_name: '위다이트스마트api log',
            name: 'Pivot Table',
            description: '',
            options: {},
          },
          query_result: {
            id: 1127129,
            data_source_id: 25,
            query: 'select 1',
            data: {
              columns: [
                {
                  friendly_name: 'company',
                  name: 'company',
                  type: 'string',
                },
              ],
              rows: [
                {
                  company: 'meta',
                },
              ],
              truncated: false,
            },
            runtime: 0.123,
            retrieved_at: '2026-03-23T00:00:00.000Z',
          },
        },
      ],
    });
  });
});
