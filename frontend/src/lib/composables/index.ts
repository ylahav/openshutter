/**
 * Composable utilities for CRUD operations and dialog management
 * 
 * This module exports reusable composables that eliminate code duplication
 * across admin CRUD pages. All composables follow Svelte store patterns for
 * reactive state management.
 * 
 * @example Import all composables
 * ```typescript
 * import { useCrudLoader, useCrudOperations, useDialogManager } from '$lib/composables';
 * ```
 * 
 * @example Individual imports
 * ```typescript
 * import { useCrudLoader } from '$lib/composables/useCrudLoader';
 * import { useCrudOperations } from '$lib/composables/useCrudOperations';
 * import { useDialogManager } from '$lib/composables/useDialogManager';
 * ```
 */

export { useCrudLoader } from './useCrudLoader';
export type { CrudLoaderOptions } from './useCrudLoader';

export { useCrudOperations } from './useCrudOperations';
export type { CrudOperationsOptions } from './useCrudOperations';

export { useDialogManager } from './useDialogManager';
