# Translation Guide - OpenShutter

## Overview

OpenShutter supports multiple languages with full RTL (Right-to-Left) support. The translation system uses JSON files for each language and provides utilities for managing multi-language content.

## Language Files

### Location
- `frontend/src/i18n/en.json` - English translations
- `frontend/src/i18n/he.json` - Hebrew translations
- Additional language files can be created through the admin interface

### Structure
Each language file contains nested objects for different sections:
- `navigation` - Navigation menu items
- `admin` - Admin dashboard translations
- `owner` - Owner dashboard translations
- `albums` - Album-related translations
- `photos` - Photo-related translations
- `pagination` - Pagination controls
- `loading` - Loading states
- `errors` - Error messages

## Admin Language Management

OpenShutter provides a comprehensive admin interface for managing languages and translations at `/admin/translations`.

### Features

#### 1. **View Available Languages**
- See all configured languages with their flags and codes
- Click on a language to view and edit its translations

#### 2. **Add New Languages**
- Click the "+ Add Language" button
- Select from predefined language codes (e.g., `es`, `fr`, `de`, `ar`, etc.)
- Or enter a custom language code
- Provide a display name and flag emoji
- The system will create a new translation file based on the English template

#### 3. **Edit Translations**
- Select a language from the list
- Browse translations organized by category (navigation, admin, albums, etc.)
- Click on any translation key to edit its value
- Use the search box to quickly find specific keys
- Expand/collapse categories for easier navigation

#### 4. **Auto-Translate Missing Translations**
- When editing a non-English language, use the "Auto-Translate Missing" button
- The system will automatically translate all missing keys from English
- Progress is shown during translation
- Note: Auto-translation uses machine translation and may require manual review

#### 5. **Delete Languages**
- Delete any language except English (which is the default fallback)
- Deleting a language removes its translation file permanently
- A confirmation dialog prevents accidental deletion

### Accessing Language Management

1. Navigate to `/admin` in your OpenShutter installation
2. Click on "Translations" in the admin menu
3. Or go directly to `/admin/translations`

### Supported Languages

The system supports adding any language, with predefined metadata for:
- English (en) 🇺🇸 - Default, cannot be deleted
- Hebrew (he) 🇮🇱
- Arabic (ar) 🇸🇦
- Spanish (es) 🇪🇸
- French (fr) 🇫🇷
- German (de) 🇩🇪
- Italian (it) 🇮🇹
- Portuguese (pt) 🇵🇹
- Russian (ru) 🇷🇺
- Japanese (ja) 🇯🇵
- Korean (ko) 🇰🇷
- Chinese (zh) 🇨🇳
- And many more...

Custom language codes can also be added if needed.

## Admin Translation Keys

### Blog Categories Management
The following keys were added for the blog categories feature:

#### English (`src/i18n/en.json`)
```json
{
  "admin": {
    "blogCategories": "Blog Categories",
    "manageBlogCategories": "Manage blog categories",
    "createNewCategory": "Create New Category",
    "backToDashboard": "Back to Dashboard",
    "searchCategories": "Search Categories",
    "search": "Search",
    "searchPlaceholder": "Search by title...",
    "status": "Status",
    "allStatuses": "All Statuses",
    "noCategories": "No categories found",
    "getStartedByCreatingCategory": "Get started by creating your first category",
    "title": "Title",
    "alias": "Alias",
    "sortOrder": "Sort Order",
    "created": "Created",
    "actions": "Actions",
    "edit": "Edit",
    "activate": "Activate",
    "deactivate": "Deactivate",
    "delete": "Delete",
    "basicInformation": "Basic Information",
    "leadingImage": "Leading Image",
    "backToCategories": "Back to Categories",
    "titleRequired": "Title is required",
    "createCategory": "Create Category",
    "categoryCreatedSuccessfully": "Category created successfully",
    "categoryUpdatedSuccessfully": "Category updated successfully",
    "enterCategoryTitle": "Enter category title",
    "enterCategoryDescription": "Enter category description",
    "saving": "Saving...",
    "editCategoryDescription": "Edit Category Description",
    "sortOrderHelp": "Lower numbers appear first"
  }
}
```

#### Hebrew (`src/i18n/he.json`)
```json
{
  "admin": {
    "blogCategories": "קטגוריות בלוג",
    "manageBlogCategories": "נהל קטגוריות בלוג",
    "createNewCategory": "צור קטגוריה חדשה",
    "backToDashboard": "חזור ללוח הבקרה",
    "searchCategories": "חפש קטגוריות",
    "search": "חפש",
    "searchPlaceholder": "חפש לפי כותרת...",
    "status": "סטטוס",
    "allStatuses": "כל הסטטוסים",
    "noCategories": "לא נמצאו קטגוריות",
    "getStartedByCreatingCategory": "התחל על ידי יצירת הקטגוריה הראשונה שלך",
    "title": "כותרת",
    "alias": "כינוי",
    "sortOrder": "סדר מיון",
    "created": "נוצר",
    "actions": "פעולות",
    "edit": "ערוך",
    "activate": "הפעל",
    "deactivate": "השבת",
    "delete": "מחק",
    "basicInformation": "מידע בסיסי",
    "leadingImage": "תמונה מובילה",
    "backToCategories": "חזור לקטגוריות",
    "titleRequired": "כותרת נדרשת",
    "createCategory": "צור קטגוריה",
    "categoryCreatedSuccessfully": "קטגוריה נוצרה בהצלחה",
    "categoryUpdatedSuccessfully": "קטגוריה עודכנה בהצלחה",
    "enterCategoryTitle": "הכנס כותרת קטגוריה",
    "enterCategoryDescription": "הכנס תיאור קטגוריה",
    "saving": "שומר...",
    "editCategoryDescription": "ערוך תיאור קטגוריה",
    "sortOrderHelp": "מספרים נמוכים יותר מופיעים ראשונים"
  }
}
```

## Pagination Keys

### English
```json
{
  "pagination": {
    "previous": "Previous",
    "next": "Next"
  }
}
```

### Hebrew
```json
{
  "pagination": {
    "previous": "הקודם",
    "next": "הבא"
  }
}
```

## Adding New Translations

### Method 1: Using Admin Interface (Recommended)
1. Navigate to `/admin/translations`
2. Select the language you want to edit
3. Browse or search for the translation key
4. Click on the key to edit its value
5. Save changes

### Method 2: Manual File Editing
1. Open the appropriate language file (`frontend/src/i18n/en.json` or `frontend/src/i18n/he.json`)
2. Add the new key-value pair in the correct section
3. Ensure proper JSON formatting (no trailing commas)
4. The changes will be reflected after the frontend rebuilds

### 2. Use in Components
```typescript
import { useI18n } from '@/hooks/useI18n'

function MyComponent() {
  const { t } = useI18n()
  
  return (
    <div>
      <h1>{t('admin.blogCategories')}</h1>
      <p>{t('admin.manageBlogCategories')}</p>
    </div>
  )
}
```

### 3. Multi-Language Content
For content that needs to be stored in the database with multiple languages:

```typescript
import { MultiLangUtils } from '@/types/multi-lang'

// Set value for current language
const title = MultiLangUtils.setValue(existingTitle, currentLanguage, newValue)

// Get value for current language
const displayTitle = MultiLangUtils.getTextValue(title, currentLanguage)
```

## RTL Support

The system automatically handles RTL layout for Hebrew content:
- CSS classes are applied based on language direction
- Text alignment adjusts automatically
- Navigation arrows and icons flip for RTL languages

## Best Practices

1. **Consistent Naming**: Use descriptive, hierarchical key names (e.g., `admin.blogCategories.createNewCategory`)
2. **Context Grouping**: Group related translations under the same parent object
3. **Fallback Values**: Always provide English fallbacks for missing translations
4. **Validation**: Test both languages thoroughly before deployment
5. **JSON Validation**: Ensure valid JSON syntax (no comments, proper escaping)

## Troubleshooting

### Missing Translations
If a translation key is missing:
1. Check the browser console for missing key warnings
2. Add the missing key to both language files
3. Ensure the key path matches exactly (case-sensitive)

### JSON Parse Errors
If you get JSON parse errors:
1. Validate JSON syntax using an online validator
2. Check for trailing commas
3. Ensure proper quote escaping
4. Remove any comments (JSON doesn't support comments)

## Language File Management

### Backend Storage
- Language files are stored in `backend/src/i18n/` directory
- The admin interface reads from and writes to these files
- Changes made through the admin interface are immediately saved to disk

### File Structure
Each language file follows this structure:
```json
{
  "navigation": {
    "home": "Home",
    "albums": "Albums"
  },
  "admin": {
    "dashboard": "Dashboard",
    "settings": "Settings"
  }
}
```

### Adding a New Language via Admin
1. Go to `/admin/translations`
2. Click "+ Add Language"
3. Enter language code (e.g., `es` for Spanish)
4. Enter display name (e.g., "Spanish")
5. Select or enter flag emoji (e.g., 🇪🇸)
6. Click "Create"
7. The system creates a new file `backend/src/i18n/es.json` based on English template
8. Edit translations as needed

### Best Practices for Language Management
1. **Always start with English**: English is the fallback language, so ensure all keys exist in English first
2. **Use consistent keys**: Keep translation keys consistent across all languages
3. **Test thoroughly**: After adding a new language, test the UI to ensure all translations appear correctly
4. **Review auto-translations**: If using auto-translate, review and correct machine translations for accuracy
5. **Backup before deletion**: Before deleting a language, ensure you have backups if needed

*Last updated: January 2025*
