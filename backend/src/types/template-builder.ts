/**
 * Template Builder Types
 * 
 * Joomla-like template system with locations and modules
 */

export interface TemplateLocation {
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

export interface TemplateModule {
  id: string;
  type: string; // 'menu', 'albumGrid', 'hero', 'richText', 'featureGrid', 'albumsGrid', 'cta', etc.
  title?: string;
  props: Record<string, any>;
  order: number;
  published: boolean;
}

export interface TemplateModuleAssignment {
  locationId: string;
  moduleId: string;
  order: number;
}

export interface TemplatePageConfig {
  id: string;
  pageType: 'home' | 'albums' | 'album' | 'search' | 'page' | 'custom';
  pageName: string; // Display name (e.g., "Home", "Albums", "About")
  pageId?: string; // For custom pages (slug/identifier)
  moduleAssignments: TemplateModuleAssignment[]; // Modules assigned to locations for this page
}

export interface TemplateBuilderConfig {
  templateId: string;
  templateName: string;
  // Grid configuration
  gridRows?: number;
  gridColumns?: number;
  locations: TemplateLocation[];
  modules: TemplateModule[];
  assignments: TemplateModuleAssignment[]; // Default/global assignments
  pages: TemplatePageConfig[]; // Page-specific configurations
}
