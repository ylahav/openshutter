// frontend/src/lib/page-builder/modules/Hero/config.ts
export const heroConfig = {
    type: 'hero',
    label: 'Hero',
    description: 'Large banner with title, subtitle and optional button.',
    fields: [
      {
        key: 'title',
        type: 'multilangText',
        label: 'Title',
        required: true,
      },
      {
        key: 'subtitle',
        type: 'multilangText',
        label: 'Subtitle',
        required: false,
      },
      {
        key: 'showCta',
        type: 'boolean',
        label: 'Show call-to-action button',
        default: true,
        description: 'When off, title and subtitle only (no button).',
      },
      {
        key: 'ctaLabel',
        type: 'multilangText',
        label: 'Button label',
        required: false,
        visibleWhen: { showCta: true },
      },
      {
        key: 'ctaUrl',
        type: 'string',
        label: 'Button URL',
        required: false,
        visibleWhen: { showCta: true },
      },
      {
        key: 'backgroundStyle',
        type: 'select',
        label: 'Background style',
        options: ['light', 'dark', 'image', 'galleryLeading'],
        default: 'light',
        description:
          'Custom image = paste a direct image URL. Gallery leading = featured photo from the library (no URL).',
      },
      {
        key: 'backgroundImage',
        type: 'string',
        label: 'Background image URL',
        required: false,
        placeholder: 'https://…',
        visibleWhen: { backgroundStyle: 'image' },
        description: 'Required when background is Custom image. Not used for Gallery leading.',
      },
    ],
  } as const;
