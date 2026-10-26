/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { log } from './app/utils/log';

bootstrapApplication(App, appConfig).catch((err) => log.error('Failed to start the app', err));
