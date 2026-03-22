import type { Phase } from './types';

export interface PhaseTheme {
  label: string;
  fill: string;
  fillMuted: string;
  stroke: string;
}

const themes: Record<Phase, PhaseTheme> = {
  debugging: {
    label: 'Debugging',
    fill: '#f97316',
    fillMuted: 'rgba(249, 115, 22, 0.12)',
    stroke: '#ea580c',
  },
  testing: {
    label: 'Testing',
    fill: '#f59e0b',
    fillMuted: 'rgba(245, 158, 11, 0.12)',
    stroke: '#d97706',
  },
  devops: {
    label: 'DevOps',
    fill: '#a855f7',
    fillMuted: 'rgba(168, 85, 247, 0.12)',
    stroke: '#9333ea',
  },
  configuration: {
    label: 'Config',
    fill: '#64748b',
    fillMuted: 'rgba(100, 116, 139, 0.12)',
    stroke: '#475569',
  },
  coding: {
    label: 'Coding',
    fill: '#22c55e',
    fillMuted: 'rgba(34, 197, 94, 0.12)',
    stroke: '#16a34a',
  },
  research: {
    label: 'Research',
    fill: '#6366f1',
    fillMuted: 'rgba(99, 102, 241, 0.12)',
    stroke: '#4f46e5',
  },
  planning: {
    label: 'Planning',
    fill: '#3b82f6',
    fillMuted: 'rgba(59, 130, 246, 0.12)',
    stroke: '#2563eb',
  },
  conversation: {
    label: 'Chat',
    fill: '#9ca3af',
    fillMuted: 'rgba(156, 163, 175, 0.12)',
    stroke: '#6b7280',
  },
};

export function getPhaseTheme(phase: Phase): PhaseTheme {
  return themes[phase];
}
