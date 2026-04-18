import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher, withToken } from '../api';
import { Footer } from '../components/Footer';
import { useSettings } from '../contexts/useSettings';
import type { AppConfig, Settings as SettingsType } from '../types';
import { Field, Section } from './SettingsControls';
import {
  AppearanceSection,
  LiveUpdatesSection,
  SessionListSection,
  SessionViewSection,
} from './SettingsSections';

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
      const res = await fetch(withToken('/api/settings'), {
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
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
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
        <AppearanceSection form={form} update={update} fieldErrors={fieldErrors} />
        <SessionListSection form={form} update={update} fieldErrors={fieldErrors} />
        <SessionViewSection form={form} update={update} fieldErrors={fieldErrors} />
        <LiveUpdatesSection form={form} update={update} fieldErrors={fieldErrors} />
        {config && (
          <Section title="Storage">
            <Field label="Settings file" description="Where your preferences are stored on disk">
              <code className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-fg">
                {config.settingsPath}
              </code>
            </Field>
            <Field
              label="Projects file"
              description="Where your project definitions are stored on disk"
            >
              <code className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-fg">
                {config.projectsPath}
              </code>
            </Field>
          </Section>
        )}
      </div>
      <Footer />
    </div>
  );
}
