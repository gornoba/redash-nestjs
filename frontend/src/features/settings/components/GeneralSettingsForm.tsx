'use client';

import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { updateOrganizationSettings } from '../api/settingsClientApi';
import type { OrganizationSettings } from '../types';
import { getTimeZoneOptions } from '@/features/queries/utils/querySchedule';
import { useToastMessage } from '@/lib/toast';

const selectClass =
  'h-[32px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]';

interface GeneralSettingsFormProps {
  dateFormatOptions: string[];
  initialSettings: OrganizationSettings;
  timeFormatOptions: string[];
}

export default function GeneralSettingsForm({
  dateFormatOptions,
  initialSettings,
  timeFormatOptions,
}: GeneralSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timezoneOptions = useMemo(
    () => getTimeZoneOptions(settings.timezone),
    [settings.timezone],
  );

  useToastMessage(message, 'success');
  useToastMessage(errorMessage, 'error');

  function patchSettings(changes: Partial<OrganizationSettings>) {
    setSettings((currentSettings) => ({ ...currentSettings, ...changes }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await updateOrganizationSettings(settings);
      setSettings(response.settings);
      setMessage('Settings updated.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update organization settings.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="mx-5"
      data-test="OrganizationSettings"
      onSubmit={onSubmit}
    >
      <h3 className="mt-0 mb-2.5 text-[16.38px] font-medium text-[#333]">
        General
      </h3>
      <hr className="mb-5 border-0 border-t border-[#e8e8e8]" />

      <FormRow label="Date Format">
        <select
          className={selectClass}
          data-test="DateFormatSelect"
          onChange={(event) =>
            patchSettings({ date_format: event.target.value })
          }
          value={settings.date_format}
        >
          {dateFormatOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="Time Format">
        <select
          className={selectClass}
          data-test="TimeFormatSelect"
          onChange={(event) =>
            patchSettings({ time_format: event.target.value })
          }
          value={settings.time_format}
        >
          {timeFormatOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="Time Zone">
        <select
          className={selectClass}
          data-test="TimezoneSelect"
          onChange={(event) =>
            patchSettings({ timezone: event.target.value })
          }
          value={settings.timezone}
        >
          {timezoneOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="Feature Flags">
        <div className="space-y-2">
          <CheckboxRow
            checked={settings.send_email_on_failed_scheduled_queries}
            label="Email query owners when scheduled queries fail"
            onChange={(checked) =>
              patchSettings({
                send_email_on_failed_scheduled_queries: checked,
              })
            }
          />
          <CheckboxRow
            checked={settings.multi_byte_search_enabled}
            label="Enable multi-byte (Chinese, Japanese, and Korean) search for query names and descriptions (slower)"
            onChange={(checked) =>
              patchSettings({ multi_byte_search_enabled: checked })
            }
          />
        </div>
      </FormRow>

      <FormRow label="">
        <button
          className="inline-flex h-[32px] items-center justify-center rounded-[4px] border border-[#2196F3] bg-[#2196F3] px-[15px] text-[14px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
          data-test="OrganizationSettingsSaveButton"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </FormRow>
    </form>
  );
}

function FormRow({
  children,
  label,
}: {
  children: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-start">
      <div className="mb-2 shrink-0 text-[14px] text-slate-800 sm:mb-0 sm:w-[170px] sm:pt-[5px] lg:w-[200px]">
        {label}
      </div>
      <div className="w-full sm:max-w-[500px]">{children}</div>
    </div>
  );
}

interface CheckboxRowProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

function CheckboxRow({ checked, label, onChange }: CheckboxRowProps) {
  return (
    <label className="flex items-start gap-2 text-[14px] leading-[20px] text-slate-700">
      <input
        checked={checked}
        className="mt-[2px] h-4 w-4 shrink-0 rounded border-slate-300 text-[#2196F3] focus:ring-sky-200"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
