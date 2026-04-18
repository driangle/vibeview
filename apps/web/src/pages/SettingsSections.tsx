import { Field, RadioGroup, Section, Toggle } from './SettingsControls';
import {
  applyThemePreview,
  inputClass,
  recentThresholdOptions,
  refreshOptions,
  selectClass,
} from './settings-utils';
import type { Settings } from '../types';

interface SectionProps {
  form: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  fieldErrors: Record<string, string>;
}

export function AppearanceSection({ form, update, fieldErrors }: SectionProps) {
  return (
    <Section title="Appearance">
      <Field
        label="Theme"
        description="Color scheme for the interface"
        error={fieldErrors['theme']}
      >
        <RadioGroup
          options={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ]}
          value={form.theme}
          onChange={(v) => {
            update('theme', v);
            applyThemePreview(v);
          }}
        />
      </Field>
      <Field
        label="Date format"
        description="How timestamps are displayed"
        error={fieldErrors['dateFormat']}
      >
        <RadioGroup
          options={[
            { label: 'Relative', value: 'relative' },
            { label: 'Absolute', value: 'absolute' },
          ]}
          value={form.dateFormat}
          onChange={(v) => update('dateFormat', v)}
        />
      </Field>
    </Section>
  );
}

export function SessionListSection({ form, update, fieldErrors }: SectionProps) {
  return (
    <Section title="Session List">
      <Field label="Default sort column" error={fieldErrors['defaultSort.column']}>
        <select
          value={form.defaultSort.column}
          onChange={(e) =>
            update('defaultSort', {
              ...form.defaultSort,
              column: e.target.value,
            })
          }
          className={selectClass}
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="directory">Directory</option>
          <option value="messages">Messages</option>
          <option value="tokens">Tokens</option>
          <option value="cost">Cost</option>
        </select>
      </Field>
      <Field label="Default sort direction" error={fieldErrors['defaultSort.direction']}>
        <RadioGroup
          options={[
            { label: 'Asc', value: 'asc' },
            { label: 'Desc', value: 'desc' },
          ]}
          value={form.defaultSort.direction}
          onChange={(v) => update('defaultSort', { ...form.defaultSort, direction: v })}
        />
      </Field>
      <Field
        label="Page size"
        description="Sessions per page (25-500)"
        error={fieldErrors['pageSize']}
      >
        <input
          type="number"
          min={25}
          max={500}
          value={form.pageSize}
          onChange={(e) => update('pageSize', parseInt(e.target.value) || 25)}
          className={inputClass}
        />
      </Field>
    </Section>
  );
}

export function SessionViewSection({ form, update, fieldErrors }: SectionProps) {
  return (
    <Section title="Session View">
      <Field label="Auto-follow" description="Auto-scroll to new messages">
        <Toggle checked={form.autoFollow} onChange={(v) => update('autoFollow', v)} />
      </Field>
      <Field
        label="Messages per page"
        description="Messages loaded per page (25-500)"
        error={fieldErrors['messagesPerPage']}
      >
        <input
          type="number"
          min={25}
          max={500}
          value={form.messagesPerPage}
          onChange={(e) => update('messagesPerPage', parseInt(e.target.value) || 25)}
          className={inputClass}
        />
      </Field>
    </Section>
  );
}

export function LiveUpdatesSection({ form, update, fieldErrors }: SectionProps) {
  return (
    <Section title="Live Updates">
      <Field
        label="Refresh interval"
        description="Polling interval for session updates"
        error={fieldErrors['refreshInterval']}
      >
        <select
          value={form.refreshInterval}
          onChange={(e) => update('refreshInterval', parseInt(e.target.value))}
          className={selectClass}
        >
          {refreshOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Recent threshold"
        description="How long a session is considered 'recent'"
        error={fieldErrors['recentThreshold']}
      >
        <select
          value={form.recentThreshold}
          onChange={(e) => update('recentThreshold', parseInt(e.target.value))}
          className={selectClass}
        >
          {recentThresholdOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    </Section>
  );
}
