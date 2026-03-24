import axios from 'axios';

import { getApiBaseUrl } from '@/lib/api-base-url';
import type { PublicEmbedResponse } from '@/features/queries/types';

function normalizeVisibleColumns(embed: PublicEmbedResponse) {
  const rawColumns = Array.isArray(embed.visualization.options?.columns)
    ? embed.visualization.options.columns
    : [];
  const configuredColumnMap = new Map<
    string,
    {
      name: string;
      title: string;
      visible: boolean;
    }
  >();

  rawColumns.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const typedItem = item as {
      name?: string;
      title?: string;
      visible?: boolean;
    };

    if (!typedItem.name) {
      return;
    }

    configuredColumnMap.set(typedItem.name, {
      name: typedItem.name,
      title: typedItem.title ?? typedItem.name,
      visible: typedItem.visible ?? true,
    });
  });

  return (embed.query_result?.data.columns ?? [])
    .map((column) => {
      const configuredColumn = configuredColumnMap.get(column.name);
      return {
        name: column.name,
        title: configuredColumn?.title ?? column.name,
        visible: configuredColumn?.visible ?? true,
      };
    })
    .filter((column) => column.visible);
}

async function getEmbedData(
  queryId: number,
  visualizationId: number,
  apiKey: string,
) {
  const response = await axios.get<PublicEmbedResponse>(
    `${getApiBaseUrl()}/api/embed/query/${queryId}/visualization/${visualizationId}`,
    {
      params: {
        api_key: apiKey,
      },
      timeout: 10000,
    },
  );

  return response.data;
}

export default async function EmbeddedVisualizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ queryId: string; visualizationId: string }>;
  searchParams: Promise<{ api_key?: string }>;
}) {
  const [{ queryId, visualizationId }, { api_key: apiKey }] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[14px] text-[#595959]">
        Missing api_key.
      </div>
    );
  }

  const embed = await getEmbedData(Number(queryId), Number(visualizationId), apiKey);
  const columns = normalizeVisibleColumns(embed);
  const rows = embed.query_result?.data.rows ?? [];

  return (
    <div className="min-h-screen bg-white p-4 text-[#323232]">
      <div className="mb-4 text-[18px] font-medium">{embed.query.name}</div>
      <div className="overflow-x-auto rounded-[2px] border border-[#e8e8e8]">
        <table className="min-w-full w-max border-collapse text-[13px] text-[#595959]">
          <thead>
            <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
              {columns.map((column) => (
                <th
                  key={column.name}
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-[#333]"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`embed-row-${rowIndex}`} className="border-b border-[#f0f0f0]">
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.name}`}
                    className="whitespace-nowrap px-3 py-2"
                  >
                    {String(row[column.name] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
