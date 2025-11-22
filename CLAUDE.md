# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Prerequisites
- Node v20.19.5 (see .nvmrc)
- npm workspaces

### Installation
```bash
npm install
```

### Development Server
```bash
# Main GUI development server (port 8601)
cd packages/scratch-gui && npm start

# VM playground (port 8073)
cd packages/scratch-vm && npm start
```

### Building
```bash
# Full monorepo build
npm run build

# Individual package builds
cd packages/scratch-gui
npm run build:dist          # Production build
npm run build:dist-standalone  # Standalone bundle
```

### Testing
```bash
# Full test suite
npm test

# Individual test types
npm run test:unit
npm run test:lint
npm run test:integration    # Requires build first

# Run single test file
$(npm bin)/jest --runInBand test/unit/components/button.test.jsx

# Integration with visible browser
USE_HEADLESS=no $(npm bin)/jest --runInBand test/integration/backpack.test.js

# VM package tests (TAP)
cd packages/scratch-vm
npm run tap:unit
npm run tap:integration
```

### Cleaning
```bash
npm run clean
```

## Architecture Overview

### Project Structure
This is the Scratch 3.0 Editor - a visual programming platform built as an npm workspace monorepo with 5 packages:

- **scratch-gui**: Main React UI with Redux state management
- **scratch-vm**: Virtual machine that executes Scratch code blocks
- **scratch-render**: WebGL renderer for sprites and stage
- **scratch-svg-renderer**: SVG to canvas/bitmap processor
- **task-herder**: Async task queue with rate limiting

### Tech Stack
- React 18 with Redux
- Webpack 5, Babel 7
- Mixed JavaScript/TypeScript (gradual migration)
- Jest for unit tests, Selenium for integration tests
- CSS Modules with PostCSS
- React-Intl for i18n (Transifex)

### scratch-gui Source Structure

```
src/
├── components/     # Presentational React components (~70)
├── containers/     # Redux-connected components (~50)
├── reducers/       # Redux reducers (~30)
├── lib/            # Utilities and HOCs (~60+)
│   ├── *-hoc.jsx   # Higher-order components for VM, storage, i18n
│   ├── themes/     # High contrast theme support
│   └── libraries/  # Asset libraries (costumes, sprites, sounds)
└── playground/     # Development playground
```

### Key Architectural Patterns

**Container/Presentational Separation**: Containers in `containers/` connect to Redux and handle logic; components in `components/` are pure presentation.

**Higher-Order Components (HOCs)**: Core functionality (VM management, project loading/saving, localization) is implemented as HOCs that wrap components. Found in `lib/*-hoc.jsx`.

**Project State Machine**: `reducers/project-state.js` implements a finite state machine for project lifecycle (NOT_LOADED → FETCHING → LOADING_VM → SHOWING, etc.).

**VM Integration**: The `@scratch/scratch-vm` runtime is connected via `vm-manager-hoc.jsx` and `vm-listener-hoc.jsx`, with audio engine attached for sound support.

### Entry Points
- Main export: `packages/scratch-gui/src/index.ts`
- Standalone: `packages/scratch-gui/src/index-standalone.tsx`
- Dev playground: `packages/scratch-gui/src/playground/`

## Naming Conventions

- **Components**: PascalCase files (`.jsx`/`.tsx`), PascalCase names
- **Reducers**: lowercase-with-dashes (`.js`/`.ts`)
- **Actions**: SCREAMING_SNAKE_CASE
- **CSS Classes**: lowercase-with-dashes (CSS Modules)
- **Utilities**: camelCase

## Testing Patterns

- Unit tests: Jest + React Testing Library in `test/unit/`
- Integration tests: Selenium WebDriver in `test/integration/`
- Test naming: `component.jsx` → `component.test.jsx`
- Mocks for assets: `test/__mocks__/`

## Git Conventions

Uses conventional commits enforced by commitlint and Husky. Semantic versioning for releases - see `Release.md` for release process.

## Browser Support

Chrome >= 63, Edge >= 15, Firefox >= 57, Safari >= 11
