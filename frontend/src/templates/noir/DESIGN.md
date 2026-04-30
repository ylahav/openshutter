---
version: alpha
name: Noir
description: A dark, full-bleed photography template. Black canvas, DM Mono labels, DM Sans headings.

colors:
  canvas: "#080808"
  surface: "#141414"
  surface-2: "#1c1c1c"
  on-canvas: "#f5f5f3"
  on-canvas-secondary: "#5e5e5b"
  on-canvas-muted: "#2a2a28"
  border: "#141414"
  primary: "#f5f5f3"
  on-primary: "#080808"

typography:
  heading:
    fontFamily: DM Sans
    fontWeight: 200
    fontSize: 32px
    letterSpacing: 0.04em
  body:
    fontFamily: DM Sans
    fontWeight: 300
    fontSize: 15px
    lineHeight: 1.8
  label:
    fontFamily: DM Mono
    fontWeight: 400
    fontSize: 10px
    letterSpacing: 0.18em
  label-sm:
    fontFamily: DM Mono
    fontWeight: 400
    fontSize: 9px
    letterSpacing: 0.22em
  input:
    fontFamily: DM Mono
    fontWeight: 400
    fontSize: 13px
    letterSpacing: 0.04em

rounded:
  none: 0px

spacing:
  page-x: 32px
  gap: 2px

components:
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-canvas-secondary}"
    rounded: "{rounded.none}"
    padding: 4px 10px
    typography: "{typography.label-sm}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    padding: 12px 28px
    typography: "{typography.label-sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-canvas}"
    rounded: "{rounded.none}"
    padding: 10px 14px
    typography: "{typography.input}"
---

## Noir Design Source

This file is the source of truth for generator-managed theme defaults and shared SCSS.

Run:

`pnpm run design:sync noir`
