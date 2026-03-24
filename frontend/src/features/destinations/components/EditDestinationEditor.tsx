"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import DynamicDataSourceForm from "@/features/data-sources/components/DynamicDataSourceForm";

import {
  deleteDestination,
  updateDestination,
} from "../api/destinationsClientApi";
import type { DestinationDetail, DestinationTypeDefinition } from "../types";
import {
  buildDestinationFields,
  hasFilledExtraField,
} from "../utils/dynamicForm";
import { getDestinationLogoPath } from "../utils/logo";

interface EditDestinationEditorProps {
  destination: DestinationDetail;
  types: DestinationTypeDefinition[];
}

export default function EditDestinationEditor({
  destination,
  types,
}: EditDestinationEditorProps) {
  const router = useRouter();
  const selectedType = useMemo(
    () => types.find((item) => item.type === destination.type) ?? null,
    [destination.type, types],
  );

  if (!selectedType) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-5 py-6 text-[14px] text-slate-500">
        Unsupported alert destination type.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[460px]" data-test="Destination">
        <div className="mb-3 text-center">
          <img
            alt={selectedType.name}
            className="mx-auto h-16 w-16 object-contain p-[5px]"
            onError={(event) => {
              event.currentTarget.src = "/static/images/redash_icon_small.png";
            }}
            src={getDestinationLogoPath(selectedType.type)}
          />
          <h3 className="m-0 text-[24px] font-medium text-slate-800">
            {selectedType.name}
          </h3>
        </div>

        <DynamicDataSourceForm
          actions={[
            {
              label: "Delete",
              danger: true,
              onClick: async () => {
                const shouldDelete = window.confirm(
                  "Are you sure you want to delete this alert destination?",
                );

                if (!shouldDelete) {
                  return;
                }

                await deleteDestination(destination.id);
                router.push("/destinations");
                router.refresh();
              },
            },
          ]}
          defaultShowExtraFields={hasFilledExtraField(
            selectedType,
            destination,
          )}
          fields={buildDestinationFields(selectedType, destination)}
          formId={`edit-destination-${destination.id}`}
          onSubmit={async (values) => {
            const { name, ...options } = values;

            await updateDestination(destination.id, {
              name: String(name ?? ""),
              options,
              type: selectedType.type,
            });

            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
