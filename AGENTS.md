# Grand Virtual Piano — Developer Guidelines

## Overview

Grand Virtual Piano is an 88-key virtual concert grand piano platform built with:

- **Framework**: TanStack Start + React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Audio Engine**: Tone.js with 100% authentic Yamaha C5 Grand Concert acoustic samples
- **Acoustic Design**: Clean physical felt damping (0.24s release), zero artificial lowpass muffling, pure studio output

## Architecture & Code Standards

1. Keep the UI 100% responsive and viewport-locked (`h-[100dvh] overflow-hidden`) on the `/play` route.
2. Maintain clean, accessible keyboard navigation (Virtual Piano notation mapping).
3. Ensure all tests in `tests/` pass with 100% success rate before commiting (`npm run test`).
4. Keep zero ESLint and Prettier errors (`npm run format && npm run lint`).
