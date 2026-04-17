# Page Builder Modules

## Purpose

A Page Builder module is the renderable unit used inside page rows/columns.

Examples:

- `hero`
- `richText`
- `layoutShell`
- `albumsGrid`
- `albumView`
- `loginForm`

## File locations

Base implementation:

- `frontend/src/lib/page-builder/modules/*`

Optional template override:

- `frontend/src/templates/<pack>/components/page-builder/*Module.svelte`

## Current override rule

Page Builder resolves a module type from the module map.

Resolution order:

1. Template-specific override from `template-module-overrides.ts`
2. Base module from `src/lib/page-builder/modules`

If a template needs a different visual implementation, create a template-specific `*Module.svelte` adapter.

## Module props

The renderer spreads `module.props` onto the resolved module component.

Common expectations:

- support normal typed props for your module
- accept `className` when wrapper-level styling is needed
- accept route/page context through the `data` prop if the module needs page context

## Admin integration

To make a module editable from the admin UI, update:

- module picker options in `frontend/src/routes/admin/pages/+page.svelte`
- any module-specific editor UI in that file
- prop serialization/deserialization logic as needed

## Styling

Use the template stylesheet for template-specific visual changes.

Recommended pattern:

- keep shared behavior in the base module
- keep template-specific visuals in template overrides and pack stylesheets

## When to create a new module

Create a new module when:

- the component has reusable meaning in layouts
- it needs its own props contract
- it may appear in multiple pages/templates

Do not create a new module if the change is only a minor visual variation of an existing module. Prefer a template override in that case.
