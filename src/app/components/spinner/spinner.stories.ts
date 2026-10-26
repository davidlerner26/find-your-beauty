import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Spinner } from './spinner';

const meta: Meta<Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<Spinner>;

export const Default: Story = {};

// Inside buttons and cards
export const Small: Story = { args: { small: true } };
