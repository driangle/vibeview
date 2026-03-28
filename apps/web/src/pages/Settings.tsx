import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import { useSettings } from '../contexts/useSettings';
import type { AppConfig, Settings as SettingsType, ModelPricing } from '../types';

function applyThemePreview(theme: string) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

const selectClass =
  'rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none';

const inputClass =
  'rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none w-28';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === opt.value
              ? 'bg-primary text-primary-fg'
              : 'bg-secondary text-secondary-fg hover:bg-muted'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-fg">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-fg">{description}</div>}
        {error && <div className="mt-0.5 text-xs text-destructive">{error}</div>}
      </div>
      <div className={`shrink-0 ${error ? 'ring-1 ring-destructive rounded-md' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">{title}</h2>
      <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
        {children}
      </div>
    </div>
  );
}

function CustomPricingEditor({
  pricing,
  onChange,
}: {
  pricing: Record<string, ModelPricing>;
  onChange: (p: Record<string, ModelPricing>) => void;
}) {
  const entries = Object.entries(pricing);
  const [newModel, setNewModel] = useState('');

  function updateEntry(model: string, field: keyof ModelPricing, val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    onChange({ ...pricing, [model]: { ...pricing[model], [field]: num } });
  }

  function addEntry() {
    const name = newModel.trim();
    if (!name || pricing[name]) return;
    onChange({ ...pricing, [name]: { inputPerM: 0, outputPerM: 0 } });
    setNewModel('');
  }

  function removeEntry(model: string) {
    const next = { ...pricing };
    delete next[model];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {entries.map(([model, p]) => (
        <div key={model} className="flex items-center gap-2 text-xs">
          <span className="w-32 truncate font-mono text-fg" title={model}>
            {model}
          </span>
          <label className="text-muted-fg">In:</label>
          <input
            type="number"
            step="0.01"
            value={p.inputPerM}
            onChange={(e) => updateEntry(model, 'inputPerM', e.target.value)}
            className={`${inputClass} w-20`}
          />
          <label className="text-muted-fg">Out:</label>
          <input
            type="number"
            step="0.01"
            value={p.outputPerM}
            onChange={(e) => updateEntry(model, 'outputPerM', e.target.value)}
            className={`${inputClass} w-20`}
          />
          <button
            type="button"
            onClick={() => removeEntry(model)}
            className="text-muted-fg hover:text-destructive transition-colors"
          >
            &times;
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs">
        <input
          type="text"
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addEntry()}
          placeholder="model-name"
          className={`${inputClass} w-32 font-mono`}
        />
        <button
          type="button"
          onClick={addEntry}
          className="rounded bg-secondary px-2 py-1.5 text-xs text-secondary-fg hover:bg-muted transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

const refreshOptions = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
];

const recentThresholdOptions = [
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
  { label: '15 min', value: 900000 },
  { label: '30 min', value: 1800000 },
  { label: '1 hour', value: 3600000 },
];

function StorageInfo({ config }: { config: AppConfig }) {
  return (
    <Section title="Storage">
      <Field label="Settings file" description="Where your preferences are stored on disk">
        <code className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-fg">
          {config.settingsPath}
        </code>
      </Field>
      <Field label="Projects file" description="Where your project definitions are stored on disk">
        <code className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-fg">
          {config.projectsPath}
        </code>
      </Field>
    </Section>
  );
}

export function Settings() {
  const { data: config } = useSWR<AppConfig>('/api/config', fetcher);
  const { settings, updateSettings, isLoaded } = useSettings();

  const [form, setForm] = useState<SettingsType>(settings);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sync form when settings load from API for the first time.
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (isLoaded && !initialized) {
      setForm(settings);
      setInitialized(true);
    }
  }, [isLoaded, initialized, settings]);

  function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
    setFieldErrors({});
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: body.error || 'Failed to save' });
        if (body.fieldErrors) {
          setFieldErrors(body.fieldErrors);
        }
        return;
      }
      // Sync the context with the saved values.
      await updateSettings(body);
      setForm(body);
      setStatus({ type: 'success', message: 'Settings saved' });
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = JSON.stringify(form) !== JSON.stringify(settings);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg">Settings</h1>
        <div className="flex items-center gap-3">
          {status && (
            <span
              className={`text-xs ${status.type === 'success' ? 'text-success' : 'text-destructive'}`}
            >
              {status.message}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || !hasChanges}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
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
          <Field label="Show costs" description="Display cost column and total cost summary">
            <Toggle checked={form.showCost} onChange={(v) => update('showCost', v)} />
          </Field>
        </Section>

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

        <Section title="Custom Model Pricing">
          <div className="py-4">
            <p className="mb-3 text-xs text-muted-fg">
              Override per-million-token pricing for specific models.
            </p>
            <CustomPricingEditor
              pricing={form.customModelPricing}
              onChange={(p) => update('customModelPricing', p)}
            />
          </div>
        </Section>

        {config && <StorageInfo config={config} />}
      </div>
    </div>
  );
}
