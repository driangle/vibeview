import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { NavBar } from './NavBar';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import type { Project } from '../types';

let mockProjects: Project[] = [];

beforeEach(() => {
  mockProjects = [];
  localStorage.clear();

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/projects') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) });
      }
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ standalone: true, paths: ['/test'] }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    }),
  );
});

function renderNavBar(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
        <ProjectsProvider>
          <NavBar />
        </ProjectsProvider>
      </SWRConfig>
    </MemoryRouter>,
  );
}

describe('NavBar', () => {
  it('does not render project selector when no projects exist', () => {
    renderNavBar();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('renders project selector when projects exist', async () => {
    mockProjects = [{ id: 'p1', name: 'My Project', folderPaths: ['/a'] }];
    renderNavBar();
    const select = await screen.findByRole('combobox');
    expect(select).toBeTruthy();
    expect(screen.getByText('My Project')).toBeTruthy();
    expect(screen.getByText('All projects')).toBeTruthy();
  });

  it('preserves project param in nav links', async () => {
    mockProjects = [{ id: 'p1', name: 'My Project', folderPaths: ['/a'] }];
    renderNavBar('/?project=p1');
    // Wait for projects to load
    await screen.findByRole('combobox');

    const sessionsLink = screen.getByText('Sessions');
    expect(sessionsLink.getAttribute('href')).toBe('/?project=p1');

    const directoriesLink = screen.getByText('Directories');
    expect(directoriesLink.getAttribute('href')).toBe('/directories?project=p1');

    const activityLink = screen.getByText('Activity');
    expect(activityLink.getAttribute('href')).toBe('/activity?project=p1');
  });

  it('nav links have plain paths when no project is selected', async () => {
    mockProjects = [{ id: 'p1', name: 'My Project', folderPaths: ['/a'] }];
    renderNavBar('/');
    await screen.findByRole('combobox');

    const sessionsLink = screen.getByText('Sessions');
    expect(sessionsLink.getAttribute('href')).toBe('/');

    const directoriesLink = screen.getByText('Directories');
    expect(directoriesLink.getAttribute('href')).toBe('/directories');
  });

  it('changing project selector updates the URL param', async () => {
    mockProjects = [
      { id: 'p1', name: 'Alpha', folderPaths: ['/a'] },
      { id: 'p2', name: 'Beta', folderPaths: ['/b'] },
    ];
    renderNavBar('/');
    const select = await screen.findByRole('combobox');

    await userEvent.selectOptions(select, 'p1');
    // After selecting, links should preserve the project param
    const directoriesLink = screen.getByText('Directories');
    expect(directoriesLink.getAttribute('href')).toBe('/directories?project=p1');
  });
});
