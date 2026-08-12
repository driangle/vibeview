import { createContext, useContext } from 'react';

/**
 * True while rendering inside a static exported page (`vibeview export`).
 *
 * An exported page carries its data inline and has no server behind it, so the
 * few affordances that require a live backend opt out of rendering. Everything
 * else is the same component tree the web app renders.
 */
export const StaticExportContext = createContext(false);

export function useStaticExport(): boolean {
  return useContext(StaticExportContext);
}
