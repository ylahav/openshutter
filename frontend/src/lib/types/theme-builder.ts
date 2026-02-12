/**
 * Theme Builder Types
 *
 * Joomla-like theme system with locations and modules
 */

export interface ThemeLocation {
  id: string;
  name: string;
  description?: string;
  order: number;
  // Grid position (1-indexed)
  startRow?: number;
  endRow?: number;
  startCol?: number;
  endCol?: number;
}

export interface ThemeModule {
  id: string;
  type: string; // 'menu', 'albumGrid', 'hero', 'richText', 'featureGrid', 'albumsGrid', 'cta', etc.
  title?: string;
  props: Record<string, any>;
  order: number;
  published: boolean;
}

export interface ThemeModuleAssignment {
  locationId: string;
  moduleId: string;
  order: number;
}

export interface ThemePageConfig {
  id: string;
  pageType: 'home' | 'albums' | 'album' | 'search' | 'page' | 'custom';
  pageName: string; // Display name (e.g., "Home", "Albums", "About")
  pageId?: string; // For custom pages (slug/identifier)
  moduleAssignments: ThemeModuleAssignment[]; // Modules assigned to locations for this page
}

export interface ThemeBuilderConfig {
  templateId: string; // Kept for DB backward compat; maps to themeId in UI
  templateName: string; // Kept for DB backward compat; maps to themeName in UI
  // Grid configuration
  gridRows?: number;
  gridColumns?: number;
  locations: ThemeLocation[];
  modules: ThemeModule[];
  assignments: ThemeModuleAssignment[]; // Default/global assignments
  pages: ThemePageConfig[]; // Page-specific configurations
}
