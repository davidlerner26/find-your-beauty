import '@angular/localize/init';
import '../src/styles.scss';
import { APP_INITIALIZER, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { applicationConfig, type Preview } from '@storybook/angular-vite';

// The app has two looks: the light one of the clients and the teal one of the professional area (a class on the body)
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'The look of the page',
      toolbar: {
        title: 'Look',
        icon: 'paintbrush',
        items: [
          { value: 'client', title: 'Clients (light)' },
          { value: 'pro', title: 'Professional area (teal)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'client' },
  decorators: [
    // Like app.ts: the icons of the app are the Material Symbols, not the older Material Icons
    applicationConfig({
      providers: [
        {
          provide: APP_INITIALIZER,
          multi: true,
          useFactory: () => {
            const icons = inject(MatIconRegistry);
            return () => icons.setDefaultFontSetClass('material-symbols-outlined');
          },
        },
      ],
    }),
    (story, context) => {
      document.body.classList.toggle('pro-theme', context.globals['theme'] === 'pro');
      return story();
    },
  ],
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: 'error' },
  },
};

export default preview;
