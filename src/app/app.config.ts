import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { processInterceptor } from './core/process.interceptor';

import { providePrimeNG } from 'primeng/config';
import EticPreset from './core/theme/etic-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    providePrimeNG({ theme: { preset: EticPreset, options: { darkModeSelector: '.app-dark' } } }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([processInterceptor, authInterceptor]))
  ]
};
