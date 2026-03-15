---
title: "Scaffold React frontend with Vite and Tailwind"
id: "01kkqx8dr"
status: pending
priority: critical
effort: small
type: chore
tags: ["frontend", "infrastructure"]
phase: "foundation"
created: "2026-03-15"
---

# Scaffold React frontend with Vite and Tailwind

## Objective

Set up the React 19 SPA in the `web/` directory with Vite, Tailwind CSS, TypeScript, React Router, and SWR. This is the frontend foundation that all UI tasks build on.

## Tasks

- [ ] Initialize Vite project with React 19 and TypeScript in `web/`
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure React Router with routes for `/` and `/session/:id`
- [ ] Install SWR for data fetching
- [ ] Set up directory structure: `src/components/`, `src/pages/`, `src/hooks/`, `src/types/`
- [ ] Create placeholder page components for SessionList and SessionView
- [ ] Configure Vite proxy to forward `/api` requests to the Go backend during development
- [ ] Verify dev server starts and routes work

## Acceptance Criteria

- `npm run dev` starts the Vite dev server
- Navigating to `/` shows the session list placeholder
- Navigating to `/session/test` shows the session view placeholder
- Tailwind utility classes render correctly
- API requests proxy to the Go backend in dev mode
