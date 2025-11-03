import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled', // it ensures that navigating to a route with a URL fragment (e.g., /page#section2) 
        scrollPositionRestoration: 'top'  // Scrolls to the top of the page on every navigation
      })),
    provideHttpClient(
      withFetch(),
    ),
  ]
};
