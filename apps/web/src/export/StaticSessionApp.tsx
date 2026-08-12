import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SettingsProvider } from '../contexts/SettingsContext';
import { SessionView } from '../pages/SessionView';
import { StaticExportContext } from './StaticExportContext';
import { toSWRFallback, type ExportPayload } from './payload';

/**
 * The root of a statically exported session page.
 *
 * Renders the same `SessionView` the web app renders. The only difference is
 * where the data comes from: SWR is seeded with the embedded payload and all
 * revalidation is off, so no request is ever made. `MemoryRouter` supplies the
 * `:id` route param without needing a real URL.
 */
export function StaticSessionApp({ payload }: { payload: ExportPayload }) {
  return (
    <StaticExportContext.Provider value={true}>
      <SWRConfig
        value={{
          fallback: toSWRFallback(payload),
          revalidateOnMount: false,
          revalidateIfStale: false,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          shouldRetryOnError: false,
        }}
      >
        <SettingsProvider>
          <MemoryRouter initialEntries={[`/session/${payload.sessionId}`]}>
            <div className="flex h-dvh flex-col bg-bg">
              <main className="min-h-0 flex-1 overflow-auto">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/session/:id" element={<SessionView />} />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </MemoryRouter>
        </SettingsProvider>
      </SWRConfig>
    </StaticExportContext.Provider>
  );
}
