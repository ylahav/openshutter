/**
 * Canonical list of EXIF metadata field names that can be displayed.
 * Used by site config (admin selects which to show) and by components that display EXIF.
 */
export const EXIF_DISPLAY_FIELDS: Array<{ id: string; label: string }> = [
	{ id: 'make', label: 'Make' },
	{ id: 'model', label: 'Model' },
	{ id: 'serialNumber', label: 'Serial Number' },
	{ id: 'dateTime', label: 'Date/Time' },
	{ id: 'dateTimeOriginal', label: 'Date/Time Original' },
	{ id: 'dateTimeDigitized', label: 'Date/Time Digitized' },
	{ id: 'offsetTime', label: 'Offset Time' },
	{ id: 'offsetTimeOriginal', label: 'Offset Time Original' },
	{ id: 'offsetTimeDigitized', label: 'Offset Time Digitized' },
	{ id: 'exposureTime', label: 'Exposure Time' },
	{ id: 'fNumber', label: 'F-Number' },
	{ id: 'iso', label: 'ISO' },
	{ id: 'focalLength', label: 'Focal Length' },
	{ id: 'exposureProgram', label: 'Exposure Program' },
	{ id: 'exposureMode', label: 'Exposure Mode' },
	{ id: 'exposureBiasValue', label: 'Exposure Bias' },
	{ id: 'maxApertureValue', label: 'Max Aperture' },
	{ id: 'shutterSpeedValue', label: 'Shutter Speed Value' },
	{ id: 'apertureValue', label: 'Aperture Value' },
	{ id: 'whiteBalance', label: 'White Balance' },
	{ id: 'meteringMode', label: 'Metering Mode' },
	{ id: 'flash', label: 'Flash' },
	{ id: 'colorSpace', label: 'Color Space' },
	{ id: 'customRendered', label: 'Custom Rendered' },
	{ id: 'sceneCaptureType', label: 'Scene Capture Type' },
	{ id: 'xResolution', label: 'X Resolution' },
	{ id: 'yResolution', label: 'Y Resolution' },
	{ id: 'resolutionUnit', label: 'Resolution Unit' },
	{ id: 'focalPlaneXResolution', label: 'Focal Plane X Resolution' },
	{ id: 'focalPlaneYResolution', label: 'Focal Plane Y Resolution' },
	{ id: 'focalPlaneResolutionUnit', label: 'Focal Plane Resolution Unit' },
	{ id: 'lensInfo', label: 'Lens Info' },
	{ id: 'lensModel', label: 'Lens Model' },
	{ id: 'lensSerialNumber', label: 'Lens Serial Number' },
	{ id: 'software', label: 'Software' },
	{ id: 'copyright', label: 'Copyright' },
	{ id: 'exifVersion', label: 'EXIF Version' },
	{ id: 'gps', label: 'GPS / Location' },
	{ id: 'recommendedExposureIndex', label: 'Recommended Exposure Index' },
	{ id: 'subsecTimeOriginal', label: 'Subsec Time Original' },
	{ id: 'subsecTimeDigitized', label: 'Subsec Time Digitized' },
];

/**
 * Returns EXIF object filtered to only keys that should be displayed.
 * If displayFields is undefined or empty, returns all keys (show all).
 */
export function filterExifByDisplayFields(
	exif: Record<string, unknown> | null | undefined,
	displayFields: string[] | undefined
): Record<string, unknown> | null {
	if (!exif || typeof exif !== 'object') return null;
	if (!displayFields || displayFields.length === 0) return exif;
	const set = new Set(displayFields);
	const filtered: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(exif)) {
		if (key === 'gps') {
			if (set.has('gps')) filtered[key] = value;
		} else if (set.has(key)) {
			filtered[key] = value;
		}
	}
	return Object.keys(filtered).length > 0 ? filtered : null;
}
