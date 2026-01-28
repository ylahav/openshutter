# Code Duplication Analysis Report

## Executive Summary

This report identifies significant code duplication patterns across the OpenShutter codebase, particularly in admin CRUD pages. **Estimated ~630 lines of duplicated code** could be eliminated through refactoring into reusable composables and utilities.

## Major Duplication Patterns

### 1. CRUD Load Functions (High Priority)

**Pattern:** Nearly identical `load*` functions across admin pages

**Affected Files:**
- `frontend/src/routes/admin/people/+page.svelte` - `loadPeople()`
- `frontend/src/routes/admin/tags/+page.svelte` - `loadTags()`
- `frontend/src/routes/admin/locations/+page.svelte` - `loadLocations()`
- `frontend/src/routes/admin/groups/+page.svelte` - `loadGroups()`
- `frontend/src/routes/admin/users/+page.svelte` - `loadUsers()`
- `frontend/src/routes/admin/blog-categories/+page.svelte` - `loadCategories()`
- `frontend/src/routes/admin/albums/+page.svelte` - `loadAlbums()`
- And 8+ more files...

**Duplicated Code Pattern:**
```typescript
async function loadItems() {
    loading = true;
    error = '';
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (filter) params.append('filter', filter);

        const response = await fetch(`/api/admin/items?${params.toString()}`);
        if (!response.ok) {
            await handleApiErrorResponse(response);
        }
        const result = await response.json();
        items = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
    } catch (err) {
        logger.error('Error loading items:', err);
        error = handleError(err, 'Failed to load items');
    } finally {
        loading = false;
    }
}
```

**Estimated Duplication:** ~15-20 lines × 15+ files = **~225-300 lines**

**Recommendation:** Create `useCrudLoader(endpoint, options)` composable

---

### 2. CRUD Create/Edit/Delete Operations (High Priority)

**Pattern:** Nearly identical `handleCreate`, `handleEdit`, `handleDelete` functions

**Affected Files:**
- `admin/people/+page.svelte`
- `admin/tags/+page.svelte`
- `admin/locations/+page.svelte`
- `admin/groups/+page.svelte`
- `admin/users/+page.svelte`
- And 10+ more files...

**Duplicated Code Pattern:**
```typescript
async function handleCreate() {
    saving = true;
    error = '';
    message = '';
    try {
        const response = await fetch('/api/admin/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (!response.ok) {
            await handleApiErrorResponse(response);
        }
        const responseData = await response.json();
        if (!responseData) {
            throw new Error('No data returned from server');
        }
        const newItem = responseData.data || responseData;
        items = [...items, newItem];
        message = 'Item created successfully!';
        showCreateDialog = false;
        resetForm();
        setTimeout(() => { message = ''; }, 3000);
    } catch (err) {
        logger.error('Error creating item:', err);
        error = handleError(err, 'Failed to create item');
    } finally {
        saving = false;
    }
}
```

**Estimated Duplication:** ~25-30 lines × 3 operations × 15+ files = **~1,125-1,350 lines** (but some variation)

**Recommendation:** Create `useCrudOperations(endpoint, options)` composable

---

### 3. Dialog Management Functions (Medium Priority)

**Pattern:** Identical `openCreateDialog`, `openEditDialog`, `openDeleteDialog` functions

**Affected Files:**
- `admin/people/+page.svelte`
- `admin/tags/+page.svelte`
- `admin/locations/+page.svelte`
- `admin/groups/+page.svelte`
- And 10+ more files...

**Duplicated Code Pattern:**
```typescript
function openCreateDialog() {
    resetForm();
    showCreateDialog = true;
    error = '';
}

function openEditDialog(item: Item) {
    editingItem = item;
    formData = { /* populate from item */ };
    showEditDialog = true;
    error = '';
}

function openDeleteDialog(item: Item) {
    itemToDelete = item;
    showDeleteDialog = true;
}
```

**Estimated Duplication:** ~10-15 lines × 3 functions × 15+ files = **~450-675 lines**

**Recommendation:** Create `useDialogManager()` composable

---

### 4. MultiLangText Conversion Patterns (Medium Priority)

**Pattern:** Repeated conversion from string to MultiLangText object

**Occurrences:** 20+ across admin pages

**Duplicated Code Pattern:**
```typescript
const nameField = typeof item.name === 'string' 
    ? { en: item.name, he: '' } 
    : (item.name && typeof item.name === 'object' 
        ? { en: item.name.en || '', he: item.name.he || '' }
        : { en: '', he: '' });
```

**Variations:**
- `admin/groups/+page.svelte` - Line 75
- `admin/locations/+page.svelte` - Lines 122-131
- `admin/tags/+page.svelte` - Lines 114-119
- `admin/pages/+page.svelte` - Multiple occurrences
- And 15+ more files...

**Estimated Duplication:** ~5-8 lines × 20+ occurrences = **~100-160 lines**

**Recommendation:** Create `normalizeMultiLangText(value)` utility function

---

### 5. Response Parsing Patterns (Low Priority)

**Pattern:** Repeated response data extraction logic

**Occurrences:** 30+ across routes

**Duplicated Code Pattern:**
```typescript
const result = await response.json();
items = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
```

**Variations:**
- `admin/people/+page.svelte` - Line 79
- `admin/tags/+page.svelte` - Line 86
- `admin/locations/+page.svelte` - Line 89
- `admin/groups/+page.svelte` - Line 51
- And 25+ more files...

**Estimated Duplication:** ~2-3 lines × 30+ occurrences = **~60-90 lines**

**Recommendation:** Create `extractArrayResponse(result)` utility function

---

### 6. Form Reset Patterns (Low Priority)

**Pattern:** Similar `resetForm` functions

**Occurrences:** 15+ files

**Duplicated Code Pattern:**
```typescript
function resetForm() {
    formData = {
        // Reset to initial values
    };
}
```

**Estimated Duplication:** ~5-10 lines × 15+ files = **~75-150 lines**

**Recommendation:** Can be handled by composable that manages form state

---

## Summary Statistics

| Pattern | Files Affected | Lines Duplicated | Priority |
|---------|---------------|------------------|----------|
| CRUD Load Functions | 15+ | ~225-300 | High |
| CRUD Create/Edit/Delete | 15+ | ~1,125-1,350 | High |
| Dialog Management | 15+ | ~450-675 | Medium |
| MultiLangText Conversion | 20+ | ~100-160 | Medium |
| Response Parsing | 30+ | ~60-90 | Low |
| Form Reset | 15+ | ~75-150 | Low |
| **TOTAL** | **~110 files** | **~2,035-2,725 lines** | |

**Note:** Some duplication is counted multiple times (e.g., create/edit/delete in same file), so actual unique duplication is estimated at **~630-850 lines**.

## Recommended Refactoring Strategy

### Phase 1: High-Impact Composables (Priority 1)

1. **`useCrudLoader(endpoint, options)`**
   - Handles loading with search/filter params
   - Standardizes error handling
   - Returns reactive state: `{ items, loading, error, loadItems }`

2. **`useCrudOperations(endpoint, options)`**
   - Handles create, update, delete operations
   - Standardizes response handling
   - Returns: `{ create, update, delete, saving, error, message }`

3. **`useDialogManager()`**
   - Manages create/edit/delete dialog state
   - Returns: `{ showCreate, showEdit, showDelete, openCreate, openEdit, openDelete, close }`

### Phase 2: Utility Functions (Priority 2)

1. **`normalizeMultiLangText(value)`**
   - Converts string or object to standardized MultiLangText format
   - Handles edge cases and null/undefined values

2. **`extractArrayResponse(result)`**
   - Extracts array from various response formats
   - Handles both `{ data: [...] }` and direct array responses

### Phase 3: Form State Management (Priority 3)

1. **`useFormState(initialData, resetFn)`**
   - Manages form data state
   - Provides reset functionality
   - Handles validation state

## Implementation Example

### Before (Duplicated):
```typescript
// admin/people/+page.svelte
async function loadPeople() {
    loading = true;
    error = '';
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        const response = await fetch(`/api/admin/people?${params.toString()}`);
        if (!response.ok) {
            await handleApiErrorResponse(response);
        }
        const result = await response.json();
        people = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
    } catch (err) {
        logger.error('Error loading people:', err);
        error = handleError(err, 'Failed to load people');
    } finally {
        loading = false;
    }
}
```

### After (Refactored):
```typescript
// admin/people/+page.svelte
import { useCrudLoader } from '$lib/composables/useCrudLoader';

const { items: people, loading, error, loadItems: loadPeople } = useCrudLoader(
    '/api/admin/people',
    {
        searchParam: 'search',
        searchValue: () => searchTerm
    }
);
```

## Benefits of Refactoring

1. **Reduced Code:** Eliminate ~630-850 lines of duplicated code
2. **Consistency:** Standardized error handling and response parsing
3. **Maintainability:** Bug fixes and improvements in one place
4. **Type Safety:** Centralized types and validation
5. **Testing:** Easier to test reusable composables
6. **Developer Experience:** Faster development of new CRUD pages

## Migration Path

1. Create composables in `frontend/src/lib/composables/`
2. Migrate one admin page as proof of concept
3. Gradually migrate remaining pages
4. Remove old duplicated code
5. Update documentation

## Files Requiring Refactoring

### High Priority (CRUD Pages):
- `admin/people/+page.svelte`
- `admin/tags/+page.svelte`
- `admin/locations/+page.svelte`
- `admin/groups/+page.svelte`
- `admin/users/+page.svelte`
- `admin/blog-categories/+page.svelte`
- `admin/albums/+page.svelte`
- `admin/albums/[id]/+page.svelte`
- `admin/albums/[id]/edit/+page.svelte`
- `admin/photos/[id]/edit/+page.svelte`
- `admin/templates/+page.svelte`
- `admin/templates/overrides/+page.svelte`
- `admin/template-config/+page.svelte`
- `admin/site-config/+page.svelte`
- `admin/translations/+page.svelte`

### Medium Priority:
- `owner/albums/+page.svelte`
- `owner/albums/[id]/+page.svelte`
- `owner/albums/[id]/edit/+page.svelte`
- `owner/blog/+page.svelte`
- `owner/blog/new/+page.svelte`
- `owner/profile/+page.svelte`

## Notes

- Some duplication is acceptable (e.g., similar but not identical logic)
- Focus on high-impact patterns first (CRUD operations)
- Maintain backward compatibility during migration
- Consider creating a code generator for new CRUD pages
