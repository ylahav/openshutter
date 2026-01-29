import { BadRequestException } from '@nestjs/common';
import type { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/**
 * Normalize MultiLangText to a Record<string, string> format
 * 
 * Handles both string (converts to { en: string }) and object formats.
 * Trims whitespace and filters out empty strings.
 * 
 * @param value - MultiLangText value (string or Record<string, string>)
 * @param allowEmpty - If true, returns undefined instead of throwing error
 * @param fieldName - Name of the field for error messages
 * @returns Normalized Record<string, string> or undefined if empty and allowEmpty is true
 * @throws BadRequestException if value is empty and allowEmpty is false
 * 
 * @example
 * ```typescript
 * normalizeMultiLangText('Hello') // { en: 'Hello' }
 * normalizeMultiLangText({ en: 'Hello', he: 'שלום' }) // { en: 'Hello', he: 'שלום' }
 * ```
 */
export function normalizeMultiLangText(
  value: MultiLangText | undefined | null,
  allowEmpty: boolean = false,
  fieldName: string = 'Field'
): Record<string, string> | undefined {
  if (!value) {
    if (allowEmpty) {
      return undefined;
    }
    throw new BadRequestException(`${fieldName} is required`);
  }

  const normalized: Record<string, string> = {};

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      normalized.en = trimmed;
    }
  } else if (typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      const val = value[key];
      if (val && typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed) {
          normalized[key] = trimmed;
        }
      }
    });
  }

  if (Object.keys(normalized).length === 0) {
    if (allowEmpty) {
      return undefined;
    }
    throw new BadRequestException(`${fieldName} is required in at least one language`);
  }

  return normalized;
}

/**
 * Normalize MultiLangHTML to a Record<string, string> format
 * 
 * Similar to normalizeMultiLangText but preserves HTML content.
 * Does not filter out HTML tags even if they appear empty.
 * 
 * @param value - MultiLangHTML value (string or Record<string, string>)
 * @param allowEmpty - If true, returns empty object instead of throwing error
 * @returns Normalized Record<string, string> or undefined if empty and allowEmpty is false
 * 
 * @example
 * ```typescript
 * normalizeMultiLangHTML('<p>Hello</p>') // { en: '<p>Hello</p>' }
 * normalizeMultiLangHTML({ en: '<p>Hello</p>', he: '<p>שלום</p>' })
 * ```
 */
export function normalizeMultiLangHTML(
  value: MultiLangHTML | undefined | null,
  allowEmpty: boolean = false
): Record<string, string> | undefined {
  if (!value) {
    if (allowEmpty) {
      return undefined;
    }
    return undefined; // HTML fields are optional
  }

  const normalized: Record<string, string> = {};

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Don't filter out HTML content - even if it's just tags, it's valid content
    if (trimmed) {
      normalized.en = trimmed;
    }
  } else if (typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      const val = value[key];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        // Don't filter out HTML content - even if it's just tags, it's valid content
        if (trimmed) {
          normalized[key] = trimmed;
        }
      }
    });
  }

  if (Object.keys(normalized).length === 0) {
    if (allowEmpty) {
      return undefined;
    }
    return undefined; // HTML fields are optional
  }

  return normalized;
}

/**
 * Validate that MultiLangText has at least one non-empty value
 * 
 * @param value - MultiLangText value to validate
 * @param fieldName - Name of the field for error messages
 * @throws BadRequestException if value is empty
 */
export function validateMultiLangText(
  value: MultiLangText | undefined | null,
  fieldName: string = 'Field'
): void {
  normalizeMultiLangText(value, false, fieldName);
}
