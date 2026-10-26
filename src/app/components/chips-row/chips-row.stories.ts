import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ChipsRow } from './chips-row';

const meta: Meta<ChipsRow> = {
  title: 'Components/ChipsRow',
  component: ChipsRow,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<ChipsRow>;

const chips = (names: string[]) =>
  names.map((name) => `<button type="button" class="chip">${name}</button>`).join('');

// Few chips: they fit and there are no arrows
export const Fits: Story = {
  render: () => ({
    template: `<app-chips-row>${chips(['Maquiagem', 'Cabelo'])}</app-chips-row>`,
  }),
};

// Many chips: the row scrolls and the arrows appear
export const Overflows: Story = {
  render: () => ({
    template: `<div style="max-width: 360px"><app-chips-row>${chips([
      'Maquiagem social',
      'Maquiagem de noiva',
      'Penteado de noiva',
      'Escova',
      'Coloração',
      'Hidratação',
      'Progressiva',
    ])}</app-chips-row></div>`,
  }),
};
