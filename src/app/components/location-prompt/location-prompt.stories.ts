import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { applicationConfig } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { UserLocation } from '../../services/user-location';
import { LocationPrompt } from './location-prompt';

// The prompt only shows while the browser has not been asked yet: the service is replaced by one that always asks
const asking = (requesting: boolean) => ({
  provide: UserLocation,
  useValue: {
    shouldAsk: signal(true),
    requesting: signal(requesting),
    request: fn(),
    dismiss: fn(),
  },
});

const meta: Meta<LocationPrompt> = {
  title: 'Components/LocationPrompt',
  component: LocationPrompt,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<LocationPrompt>;

export const Asking: Story = {
  decorators: [applicationConfig({ providers: [asking(false)] })],
};

// After the tap on the button, while the browser waits for the answer
export const WaitingForTheBrowser: Story = {
  decorators: [applicationConfig({ providers: [asking(true)] })],
};
