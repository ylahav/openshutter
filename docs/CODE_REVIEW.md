# Code Review Summary

**Date:** March 2025  
**Scope:** Backend (NestJS) and frontend (SvelteKit) key areas.

---

## 1. Backend – Error handling ✅ Addressed

### Issue: Catch blocks convert all errors to 400

**Location:** `backend/src/users/users.controller.ts` (and similar controllers)

**Status:** Fixed. Controllers now re-throw `HttpException` (so `NotFoundException`, `BadRequestException`, etc. keep their status) and throw `InternalServerErrorException` for unexpected errors.

**Updated:** `users.controller.ts`, `people.controller.ts`, `blog-categories.controller.ts`, `albums-admin.controller.ts` — all catch blocks use:

```ts
} catch (error) {
  if (error instanceof HttpException) throw error;
  this.logger.error('...', error);
  throw new InternalServerErrorException('...');
}
```

---

## 2. Backend – Type safety ✅ Addressed

### Issue: Use of `any` in controllers and services

**Status:** Fixed in users controller and exception filter.

- **`users.controller.ts`**: Introduced `UsersListQueryOrClause`, `UsersListQuery`, `UserUpdatePayload`, and `UserDocumentRaw`. Replaced `query: any` with `UsersListQuery`, `updateData: any` with `UserUpdatePayload`, and `(updatedUser as any).name` (and similar) with a single `UserDocumentRaw` cast. Name normalization uses `Record<string, unknown>` and typed access.
- **`http-exception.filter.ts`**: Added `HttpExceptionResponseBody` interface and use it instead of `as any` when reading `exception.getResponse()`.

---

## 3. Backend – DTO validation ✅ Addressed

### Observation: UpdateUserDto and storageConfig

**Status:** Fixed.

- **`update-user.dto.ts`**: Added `GoogleDriveStorageConfigDto`, `WasabiStorageConfigDto`, and `UserStorageConfigDto` with `@IsOptional()`, `@IsString()`, `@MaxLength()` (and `@IsBoolean()` for `useAdminConfig`). `UpdateUserDto.storageConfig` now uses `@ValidateNested()` and `@Type(() => UserStorageConfigDto)`. Nested provider blocks are validated and unknown properties are stripped by the global ValidationPipe (whitelist).

---

## 4. Frontend – Error handling ✅ Addressed

**Location:** `frontend/src/lib/utils/errorHandler.ts`

- Centralized `handleError`, `handleApiErrorResponse`, `parseError`, and status-based user messages are in place.
- **Updated:** Admin and public call sites now use `handleApiErrorResponse(response)` when `!response.ok` and `handleError(err, fallback)` in catch blocks.
- **Updated:** `admin/storage/+page.svelte` (loadConfigs, saveConfig, OAuth, loadTree), `admin/pages/+page.svelte` (module save after create), `admin/template-builder/+page.svelte` (update location), `lib/templates/modern/Album.svelte` (fetchAlbumData), `lib/components/FaceDetectionViewer.svelte` (detect, add manual face).
- **Updated:** `useCrudOperations` and `useCrudLoader` send `credentials: 'include'` on fetch so admin routes receive auth cookies.

---

## 5. Frontend – Very large page components ✅ Addressed

**Location:** `frontend/src/routes/admin/pages/+page.svelte`, `frontend/src/routes/admin/users/+page.svelte`

**Status:** Addressed. Both admin pages are split into smaller components.

- **Users admin** (`admin/users/`):
  - **`types.ts`**: Shared types (`User`, `Group`, `OwnerDomain`, `UserFormData`).
  - **`components/UserFilters.svelte`**: Search, role/blocked filters, Add User button.
  - **`components/UserTable.svelte`**: Users table (user, role, groups, status, actions).
  - **`components/UserForm.svelte`**: Create/Edit form (name, username, password, role, language, groups, storage, blocked, etc.) with optional `extra` slot.
  - **`components/OwnerDomainsSection.svelte`**: Owner domains UI (add/list/update/remove) used in the Edit form slot.
  - **`+page.svelte`**: Thin container (~610 lines): state, CRUD/composables, dialogs; delegates to the above components.
- **Pages admin** (`admin/pages/`):
  - **`types.ts`**: `Page` and `PageCategoryOption`.
  - **`components/PageFilters.svelte`**: Search, category/published filters, Add Page button.
  - **`components/PageList.svelte`**: Card grid of pages (title, alias, category, status, Edit/Delete).
  - **`+page.svelte`**: Still contains Create/Edit/Delete dialogs and full page-builder/module logic (~2500 lines); list and filters are extracted. Further extraction (e.g. `PageForm.svelte`, module UI) can be done later if needed.

---

## 6. Frontend – Typing in composables ✅ Addressed

**Location:** `frontend/src/routes/admin/users/+page.svelte` and other CRUD pages.

**Status:** Typed `transformPayload` (and composable option) across admin CRUD pages.

- **`useCrudOperations.ts`**: `CrudOperationsOptions<T>` now has `transformPayload?: (data: Partial<T> & Record<string, unknown>) => unknown` and default generic `T = unknown`.
- **admin/users**: `UserPayload` type; `transformPayload(data: UserPayload): UserPayload`.
- **admin/people**: `PersonFormData` and `PersonPayload`; tags normalized with typed array.
- **admin/locations**: `LocationFormData` (coordinates as string | number); return `Partial<Location>`.
- **admin/tags**: `TagPayload`; `transformPayload(data: Partial<Tag>): TagPayload` with `?? {}` for optional MultiLang fields.
- **admin/blog-categories**: `transformPayload(data: Partial<BlogCategory>): Partial<BlogCategory>`.
- **admin/pages**: `transformPayload` already had `Partial<Page> & { gridRows?, gridColumns?, urlParams?, layoutZones? }`; layout object typed (zones, gridRows, gridColumns, urlParams).

---

## 7. Security / best practices (brief)

- **Guards:** Admin and AdminOrOwner guards are used on user/admin endpoints; keep enforcing them on any new admin routes.
- **Passwords:** User creation/update uses bcrypt and salt; ensure no plaintext passwords are logged (current code doesn’t log them).
- **Storage config:** Sensitive fields (e.g. `clientSecret`, `serviceAccountJson`, `secretAccessKey`) are stored in DB; ensure DB and backups are restricted and encrypted at rest per your security policy.

---

## 8. Positive notes

- CRUD composables (`useCrudLoader`, `useCrudOperations`, `useDialogManager`) give consistent patterns across admin pages.
- Centralized error handling and backend error classes keep status codes and user messages consistent.
- DTOs and validation (e.g. `UpdateUserDto` with `@IsIn`, `@MinLength`, `@ValidateIf`) are used in many places.
- Pagination and filters on user list (e.g. search, role, blocked) are implemented and help scalability.

---

## Summary of recommended actions

| Priority | Action |
|----------|--------|
| High     | ~~In backend controllers, stop converting all errors to 400~~ ✅ Done. |
| Medium   | ~~Replace `any` in users controller and exception filter with proper types~~ ✅ Done. |
| Medium   | ~~Add nested validation (or explicit allow-list) for `UpdateUserDto.storageConfig`~~ ✅ Done. |
| Low      | ~~Break up large admin pages (pages, users) into smaller components~~ ✅ Done. |
| Low      | ~~Type `transformPayload` and similar callbacks in frontend with proper interfaces~~ ✅ Done. |

---

*This review is a snapshot; run tests and lint after any changes.*
