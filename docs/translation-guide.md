# Translation Guide - OpenShutter

## Overview

OpenShutter supports multiple languages with full RTL (Right-to-Left) support. The translation system uses JSON files for each language and provides utilities for managing multi-language content.

## Language Files

### Location
- `src/i18n/en.json` - English translations
- `src/i18n/he.json` - Hebrew translations

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

### 1. Add to Language Files
1. Open the appropriate language file (`en.json` or `he.json`)
2. Add the new key-value pair in the correct section
3. Ensure proper JSON formatting (no trailing commas)

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

*Last updated: January 2025*
