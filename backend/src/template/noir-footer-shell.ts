/** Shared Noir footer: layout shell + inner modules (copyright + text social links). */

export const NOIR_FOOTER_SHELL_KEY = 'noir_footer';

/** Placeholder profile URLs — replace in site settings or module props. */
const NOIR_FOOTER_SOCIAL_LINKS = [
  { platform: 'instagram', url: 'https://www.instagram.com/' },
  { platform: 'flickr', url: 'https://www.flickr.com/photos/' },
];

export const noirFooterLayoutShellInstances: Record<
  string,
  { gridRows: number; gridColumns: number; modules: Record<string, unknown>[] }
> = {
  [NOIR_FOOTER_SHELL_KEY]: {
    gridRows: 1,
    gridColumns: 2,
    modules: [
      {
        _id: 'mod_noir_footer_copy',
        type: 'richText',
        props: {
          title: {},
          body: { en: '<p>&copy; 2024 OpenShutter. All rights reserved.</p>' },
          background: 'transparent',
          className: 'n-copyright',
        },
        rowOrder: 0,
        columnIndex: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        _id: 'mod_noir_footer_social',
        type: 'socialMedia',
        props: {
          align: 'end',
          orientation: 'horizontal',
          linkDisplay: 'text',
          links: NOIR_FOOTER_SOCIAL_LINKS,
        },
        rowOrder: 0,
        columnIndex: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
  },
};

export const noirFooterPageModules: Record<string, unknown>[] = [
  {
    _id: 'mod_noir_footer_shell',
    type: 'layoutShell',
    props: {
      instanceRef: NOIR_FOOTER_SHELL_KEY,
      presetKey: NOIR_FOOTER_SHELL_KEY,
      className: 'n-footer',
      gridTemplateColumns: '1fr auto',
    },
    rowOrder: 0,
    columnIndex: 0,
    rowSpan: 1,
    colSpan: 1,
  },
];
