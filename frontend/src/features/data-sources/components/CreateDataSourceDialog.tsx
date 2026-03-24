'use client';
/* eslint-disable @next/next/no-img-element */

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createDataSource,
  getDataSourceTypesClient,
} from '../api/dataSourcesClientApi';
import type { DataSourceTypeDefinition } from '../types';
import {
  buildDataSourceFields,
  hasFilledExtraField,
} from '../utils/dynamicForm';
import { getDataSourceLogoPath } from '../utils/logo';
import DynamicDataSourceForm from './DynamicDataSourceForm';
import { useToastMessage } from '@/lib/toast';

interface CreateDataSourceDialogProps {
  onClose: () => void;
}

export default function CreateDataSourceDialog({
  onClose,
}: CreateDataSourceDialogProps) {
  const router = useRouter();
  const [types, setTypes] = useState<DataSourceTypeDefinition[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] =
    useState<DataSourceTypeDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useToastMessage(error, 'error');

  useEffect(() => {
    let isMounted = true;

    void getDataSourceTypesClient()
      .then((nextTypes) => {
        if (!isMounted) {
          return;
        }

        setTypes(nextTypes);
      })
      .catch((nextError) => {
        if (!isMounted) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Failed to load data source types.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTypes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (keyword.length === 0) {
      return types;
    }

    return types.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword),
    );
  }, [searchText, types]);

  const currentStep = selectedType ? (isSubmitting ? 2 : 1) : 0;
  const formId = selectedType
    ? `create-data-source-${selectedType.type}`
    : 'create-data-source';
  const formFields = selectedType ? buildDataSourceFields(selectedType) : [];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-sm bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
        data-test="CreateSourceDialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-[22px] font-medium text-slate-800">
            Create a New Data Source
          </h4>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <StepIndicator currentStep={currentStep} />

          {!selectedType ? (
            <div>
              <input
                aria-label="Search"
                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                data-test="SearchSource"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search..."
                value={searchText}
              />

              <div className="mt-4 divide-y divide-slate-200 rounded-sm border border-slate-200">
                {isLoading ? (
                  <div className="px-5 py-8 text-center text-[14px] text-slate-500">
                    Loading...
                  </div>
                ) : error ? (
                  <div className="px-5 py-8 text-center text-[14px] text-slate-500">
                    데이터 소스 유형을 불러오지 못했습니다.
                  </div>
                ) : filteredTypes.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[14px] text-slate-500">
                    No types found.
                  </div>
                ) : (
                  filteredTypes.map((item) => (
                    <button
                      key={item.type}
                      className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left transition hover:bg-slate-50"
                      data-test="PreviewItem"
                      data-test-type={item.type}
                      onClick={() => setSelectedType(item)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <img
                          alt={item.name}
                          className="h-11 w-11 shrink-0 object-contain"
                          onError={(event) => {
                            event.currentTarget.src =
                              '/static/images/redash_icon_small.png';
                          }}
                          src={getDataSourceLogoPath(item.type)}
                        />
                        <div className="min-w-0">
                          <strong className="block text-[15px] font-medium text-slate-800">
                            {item.name}
                          </strong>
                          <div className="mt-0.5 text-[13px] text-slate-500">
                            {item.type}
                          </div>
                        </div>
                      </div>
                      <span
                        aria-hidden="true"
                        className="text-[22px] text-slate-400"
                      >
                        »
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-center gap-4 border-b border-slate-200 pb-4">
                <img
                  alt={selectedType.name}
                  className="h-12 w-12 shrink-0 object-contain"
                  onError={(event) => {
                    event.currentTarget.src =
                      '/static/images/redash_icon_small.png';
                  }}
                  src={getDataSourceLogoPath(selectedType.type)}
                />
                <h3 className="text-[24px] font-medium text-slate-800">
                  {selectedType.name}
                </h3>
              </div>

              <DynamicDataSourceForm
                defaultShowExtraFields={hasFilledExtraField(selectedType)}
                fields={formFields}
                formId={formId}
                hideSubmitButton
                onSubmit={async (values) => {
                  setError(null);
                  setIsSubmitting(true);

                  try {
                    const { name, ...options } = values;
                    const result = await createDataSource({
                      name: String(name ?? ''),
                      options,
                      type: selectedType.type,
                    });

                    router.push(`/data_sources/${result.id}`);
                  } catch (submitError) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : 'Failed saving.',
                    );
                    setIsSubmitting(false);
                    throw submitError;
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {!selectedType ? (
            <>
              <button
                className="inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                data-test="CreateSourceCancelButton"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white opacity-60"
                disabled
                type="button"
              >
                Create
              </button>
            </>
          ) : (
            <>
              <button
                className="inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  if (isSubmitting) {
                    return;
                  }

                  setSelectedType(null);
                  setSearchText('');
                  setError(null);
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
                data-test="CreateSourceSaveButton"
                disabled={isSubmitting}
                form={formId}
                type="submit"
              >
                {isSubmitting ? 'Create...' : 'Create'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps: ReactNode[] = ['Type Selection', 'Configuration', 'Done'];

  return (
    <div className="mb-6 px-3 pt-1">
      <div className="relative mx-auto flex max-w-[430px] items-center justify-between">
        <div className="absolute left-[18px] right-[18px] top-[5px] h-px bg-slate-300" />
        {steps.map((step, index) => {
          const active = index === currentStep;

          return (
            <div
              key={String(step)}
              className="relative z-10 flex min-w-[90px] flex-col items-center text-center"
            >
              <span
                className={[
                  'block h-[10px] w-[10px] rounded-full border',
                  active
                    ? 'border-[#2196F3] bg-[#2196F3]'
                    : 'border-slate-300 bg-slate-300',
                ].join(' ')}
              />
              <span
                className={[
                  'mt-3 text-[13px] leading-5',
                  active ? 'text-slate-800' : 'text-slate-400',
                ].join(' ')}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
