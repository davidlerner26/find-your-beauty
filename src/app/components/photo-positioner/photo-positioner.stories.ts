import type { Meta, StoryObj } from '@storybook/angular-vite';
import { picture } from '../story-assets';
import { PhotoPositioner } from './photo-positioner';

const meta: Meta<PhotoPositioner> = {
  title: 'Components/PhotoPositioner',
  component: PhotoPositioner,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<PhotoPositioner>;

// Drag the photo, or use the arrow keys, to choose what stays in the frame of the cards and the circle
export const WidePhoto: Story = {
  args: { src: picture('#c98b9e', 1200, 600), position: { x: 50, y: 50 } },
};

export const TallPhoto: Story = {
  args: { src: picture('#8bb7c9', 600, 1200), position: { x: 50, y: 20 } },
};
