// Shared component barrels.
// UI primitives are re-exported under an explicit namespace path to keep the
// shadcn CLI's `@/shared/components/ui` alias intact, while common composed
// components are exposed here for ergonomic feature imports.
export * from './common'
export * as UI from './ui'
