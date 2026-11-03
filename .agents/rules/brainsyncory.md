

# Project Memory — voc-market
> 73 notes | Score threshold: >40

## Safety — Never Run Destructive Commands

> Dangerous commands are actively monitored.
> Critical/high risk commands trigger error notifications in real-time.

- **NEVER** run `rm -rf`, `del /s`, `rmdir`, `format`, or any command that deletes files/directories without EXPLICIT user approval.
- **NEVER** run `DROP TABLE`, `DELETE FROM`, `TRUNCATE`, or any destructive database operation.
- **NEVER** run `git push --force`, `git reset --hard`, or any command that rewrites history.
- **NEVER** run `npm publish`, `docker rm`, `terraform destroy`, or any irreversible deployment/infrastructure command.
- **NEVER** pipe remote scripts to shell (`curl | bash`, `wget | sh`).
- **ALWAYS** ask the user before running commands that modify system state, install packages, or make network requests.
- When in doubt, **show the command first** and wait for approval.

**Stack:** JavaScript/TypeScript · Tailwind

## Project Standards

- Replaced auth StatsService — wraps unsafe operation in error boundary — confirmed 4x
- Patched security issue ImageValidationError — uses a proper password hashing ... — confirmed 12x
- convention in .gitignore
- Fixed null crash in String — prevents XSS injection attacks — confirmed 10x
- 11 potentially unused files detected — confirmed 3x
- Enable strict mode in tsconfig.json
- Prefer Array methods (map, filter, reduce) over manual loops
- Use template literals for string interpolation, not concatenation

## Known Fixes

- ❌ + import { ImageValidationError, saveUploadedWebp } from '../services/image.service'; → ✅ Patched security issue ImageValidationError — uses a proper password hashing ...
- ❌ - import { ImageValidationError, saveUploadedWebp } from '../services/image.service'; → ✅ Patched security issue ImageValidationError — uses a proper password hashing ...

## Verified Best Practices

- Agent generates new migration for every change (squash related changes)
- Agent installs packages without checking if already installed

### 📚 Core Framework Rules: [tinybirdco/tinybird-typescript-sdk-guidelines]
# Tinybird TypeScript SDK Guidelines

Guidance for using the `@tinybirdco/sdk` package to define Tinybird resources in TypeScript with complete type inference.

## When to Apply

- Installing or configuring @tinybirdco/sdk
- Defining datasources or pipes in TypeScript
- Creating typed Tinybird clients
- Using type-safe ingestion or queries
- Running tinybird dev/build/deploy commands for TypeScript projects
- Migrating from legacy .datasource/.pipe files to TypeScript
- Defining connections (Kafka, S3, GCS)
- Creating materialized views, copy pipes, or sink pipes

## Rule Files

- `rules/getting-started.md`
- `rules/configuration.md`
- `rules/defining-datasources.md`
- `rules/defining-endpoints.md`
- `rules/typed-client.md`
- `rules/low-level-api.md`
- `rules/cli-commands.md`
- `rules/connections.md`
- `rules/materialized-views.md`
- `rules/copy-sink-pipes.md`
- `rules/tokens.md`

## Quick Reference

- Install: `npm install @tinybirdco/sdk`
- Initialize: `npx tinybird init`
- Dev mode: `tinybird dev` (uses configured `devMode`, typically branch)
- Build: `tinybird build` (builds against configured dev target)
- Deploy: `tinybird deploy` (deploys to main/production)
- Preview in CI:...
(truncated)


### 📚 Core Framework Rules: [expo/expo-tailwind-setup]
# Tailwind CSS Setup for Expo with react-native-css

This guide covers setting up Tailwind CSS v4 in Expo using react-native-css and NativeWind v5 for universal styling across iOS, Android, and Web.

## Overview

This setup uses:

- **Tailwind CSS v4** - Modern CSS-first configuration
- **react-native-css** - CSS runtime for React Native
- **NativeWind v5** - Metro transformer for Tailwind in React Native
- **@tailwindcss/postcss** - PostCSS plugin for Tailwind v4

## Installation



Add resolutions for lightningcss compatibility:



- autoprefixer is not needed in Expo because of lightningcss
- postcss is included in expo by default

## Configuration Files

### Metro Config

Create or update `metro.config.js`:



### PostCSS Config

Create `postcss.config.mjs`:



### Global CSS

Create `src/global.css`:



## IMPORTANT: No Babel Config Needed

With Tailwind v4 and NativeWind v5, you do NOT need a babel.config.js for Tailwind. Remove any NativeWind babel presets if present:



## CSS Component Wrappers

Since react-native-css requires explicit CSS element wrapping, create reusable components:

### Main Components (`src/tw/index.tsx`)



### Image Component (`src/tw/image.tsx`)



...
(truncated)


### 📚 Core Framework Rules: [czlonkowski/n8n-code-javascript]
# JavaScript Code Node

Expert guidance for writing JavaScript code in n8n Code nodes.

---

## Quick Start



### Essential Rules

1. **Choose "Run Once for All Items" mode** (recommended for most use cases)
2. **Access data**: `$input.all()`, `$input.first()`, or `$input.item`
3. **CRITICAL**: Must return `[{json: {...}}]` format
4. **CRITICAL**: Webhook data is under `$json.body` (not `$json` directly)
5. **Built-ins available**: $helpers.httpRequest(), DateTime (Luxon), $jmespath()

---

## Mode Selection Guide

The Code node offers two execution modes. Choose based on your use case:

### Run Once for All Items (Recommended - Default)

**Use this mode for:** 95% of use cases

- **How it works**: Code executes **once** regardless of input count
- **Data access**: `$input.all()` or `items` array
- **Best for**: Aggregation, filtering, batch processing, transformations, API calls with all data
- **Performance**: Faster for multiple items (single execution)



**When to use:**
- ✅ Comparing items across the dataset
- ✅ Calculating totals, averages, or statistics
- ✅ Sorting or ranking items
- ✅ Deduplication
- ✅ Building aggregated reports
- ✅ Combining data from multiple items

##...
(truncated)


## Available Tools (ON-DEMAND only)
- `sys_core_01(q)` — Deep search when stuck
- `sys_core_05(query)` — Full-text lookup
> Context above IS your context. Do NOT call sys_core_14() at startup.
