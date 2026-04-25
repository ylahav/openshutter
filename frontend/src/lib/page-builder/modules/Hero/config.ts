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
      {
        key: 'imageFit',
        type: 'select',
        label: 'Image fit (image / gallery leading)',
        options: ['contain', 'cover'],
        required: false,
        description:
          'Optional. Default: Noir uses cover; other packs use contain. Controls object-fit on the hero photo.',
      },
      {
        key: 'fullViewportHero',
        type: 'boolean',
        label: 'Full viewport height (100svh)',
        required: false,
        description:
          'Optional. Noir defaults on for image heroes; set false for a shorter strip. Other packs default off unless enabled.',
      },
      {
        key: 'showHeroRule',
        type: 'boolean',
        label: 'Show rule between title and subtitle',
        required: false,
        description: 'Optional. Noir defaults on when both title and subtitle exist.',
      },
      {
        key: 'showScrollHint',
        type: 'boolean',
        label: 'Show bottom scroll hint (full-viewport image hero)',
        required: false,
        description: 'Optional. Noir defaults on for full-viewport image heroes.',
      },
      {
        key: 'scrollHintHref',
        type: 'string',
        label: 'Scroll hint link (href)',
        required: false,
        placeholder: '/albums or #section',
        description: 'Default /albums. Hash links use smooth scroll when clicked.',
      },
      {
        key: 'scrollHintLabel',
        type: 'multilangText',
        label: 'Scroll hint label',
        required: false,
      },
    ],
  } as const;
