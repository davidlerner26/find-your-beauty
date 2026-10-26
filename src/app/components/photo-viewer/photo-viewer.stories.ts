import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { PHOTOS } from '../story-assets';
import { PhotoViewer } from './photo-viewer';

const meta: Meta<PhotoViewer> = {
  title: 'Components/PhotoViewer',
  component: PhotoViewer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { alt: 'Trabalho de Ana', closed: fn() },
};
export default meta;
type Story = StoryObj<PhotoViewer>;

// Arrows, the arrow keys and swiping go to the next photo; Escape closes
export const Gallery: Story = { args: { photos: PHOTOS, start: 0 } };

export const StartingInTheMiddle: Story = { args: { photos: PHOTOS, start: 2 } };

// One photo: no arrows and no counter
export const OnePhoto: Story = { args: { photos: [PHOTOS[0]], start: 0 } };
