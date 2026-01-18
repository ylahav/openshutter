// List of available icon names
// These can be used as icon identifiers in the page builder
// Icons can be displayed as:
// 1. Icon name (rendered as SVG if available in IconRenderer)
// 2. Emoji (e.g., 🎨, 📷, ✨)
// 3. Custom text/symbols
//
// HOW TO ADD NEW ICONS:
// 1. Add the icon name to the AVAILABLE_ICON_NAMES array below
// 2. Add the corresponding SVG to the iconSVGs object in IconRenderer.svelte
//    (You can find SVG paths from lucide-icons.com or similar icon libraries)
// 3. The icon will then appear in the dropdown selector in the page builder

export const AVAILABLE_ICON_NAMES = [
	'AlertCircle',
	'ArrowLeft',
	'BarChart3',
	'Calendar',
	'Camera',
	'Check',
	'CheckCircle',
	'ChevronDown',
	'ChevronLeft',
	'ChevronRight',
	'ChevronUp',
	'Circle',
	'Clean',
	'Database',
	'Download',
	'Edit',
	'Easy',
	'Eye',
	'EyeOff',
	'Facebook',
	'Fast',
	'FileText',
	'Filter',
	'Folder',
	'FolderOpen',
	'Github',
	'Globe',
	'Home',
	'Image',
	'Instagram',
	'Intuitive',
	'Layout',
	'Linkedin',
	'Loader2',
	'LogOut',
	'Map',
	'MapPin',
	'Menu',
	'Moon',
	'Palette',
	'Plus',
	'RotateCcw',
	'Save',
	'Search',
	'Settings',
	'Star',
	'StarOff',
	'Sun',
	'Responsive',
	'Tag',
	'TabletSmartphone',
	'Trash2',
	'Twitter',
	'Type',
	'Upload',
	'User',
	'UserCheck',
	'Users',
	'Users2',
	'X',
	'XCircle',
	'Youtube',
	'Zap'
] as const;

// Export type for icon names
export type IconName = typeof AVAILABLE_ICON_NAMES[number];
