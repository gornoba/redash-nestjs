"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  deleteDataSource,
  testDataSourceConnection,
  updateDataSource,
} from "../api/dataSourcesClientApi";
import type { DataSourceDetail, DataSourceTypeDefinition } from "../types";
import {
  buildDataSourceFields,
  hasFilledExtraField,
} from "../utils/dynamicForm";
import { getDataSourceLogoPath } from "../utils/logo";
import DynamicDataSourceForm from "./DynamicDataSourceForm";

interface EditDataSourceEditorProps {
  canManage: boolean;
  dataSource: DataSourceDetail;
  types: DataSourceTypeDefinition[];
}

export default function EditDataSourceEditor({
  canManage,
  dataSource,
  types,
}: EditDataSourceEditorProps) {
  const router = useRouter();
  const selectedType = useMemo(
    () => types.find((item) => item.type === dataSource.type) ?? null,
    [dataSource.type, types],
  );

  if (!selectedType) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-5 py-6 text-[14px] text-slate-500">
        Unsupported data source type.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white">
      <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
        <img
          alt={selectedType.name}
          className="h-12 w-12 shrink-0 object-contain"
          onError={(event) => {
            event.currentTarget.src = "/static/images/redash_icon_small.png";
          }}
          src={getDataSourceLogoPath(selectedType.type)}
        />
        <h3 className="text-[24px] font-medium text-slate-800">
          {selectedType.name}
        </h3>
      </div>

      <div className="px-6 py-6">
        {!canManage ? (
          <div className="mb-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
            You can view this data source, but only administrators can edit it.
          </div>
        ) : null}
        <DynamicDataSourceForm
          actions={
            canManage
              ? [
                  {
                    label: "Delete",
                    danger: true,
                    onClick: async () => {
                      const shouldDelete = window.confirm(
                        "Are you sure you want to delete this data source?",
                      );

                      if (!shouldDelete) {
                        return;
                      }

                      await deleteDataSource(dataSource.id);
                      router.push("/data_sources");
                      router.refresh();
                    },
                  },
                  {
                    label: "Test Connection",
                    pullRight: true,
                    disableWhenDirty: true,
                    successMessage: "Success",
                    onClick: async () => {
                      const result = await testDataSourceConnection(dataSource.id);

                      if (!result.ok) {
                        throw new Error(result.message);
                      }
                    },
                  },
                ]
              : []
          }
          defaultShowExtraFields={hasFilledExtraField(selectedType, dataSource)}
          fields={buildDataSourceFields(selectedType, dataSource)}
          formId={`edit-data-source-${dataSource.id}`}
          hideSubmitButton={!canManage}
          onSubmit={async (values) => {
            if (!canManage) {
              return;
            }

            const { name, ...options } = values;

            await updateDataSource(dataSource.id, {
              name: String(name ?? ""),
              options,
              type: selectedType.type,
            });

            router.refresh();
          }}
          readOnly={!canManage}
        />
      </div>
    </div>
  );
}
