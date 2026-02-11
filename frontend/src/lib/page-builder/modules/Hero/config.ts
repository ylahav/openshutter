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
        key: 'ctaLabel',
        type: 'multilangText',
        label: 'Button label',
        required: false,
      },
      {
        key: 'ctaUrl',
        type: 'string',
        label: 'Button URL',
        required: false,
      },
      {
        key: 'backgroundStyle',
        type: 'select',
        label: 'Background style',
        options: ['light', 'dark', 'image', 'galleryLeading'],
        default: 'light',
      },
      {
        key: 'backgroundImage',
        type: 'image',
        label: 'Background image',
        required: false,
        visibleWhen: { backgroundStyle: 'image' },
      },
    ],
  } as const;
