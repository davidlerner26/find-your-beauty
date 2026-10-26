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

// The chips are the page's own (the row only scrolls them): a pill like the ones of the map screen
const PILL =
  'flex: none; padding: 0.45rem 1rem; border: 1.5px solid currentColor; border-radius: 999px; background: transparent; color: inherit; font: inherit; white-space: nowrap; cursor: pointer';

const chips = (names: string[]) =>
  names.map((name) => `<button type="button" style="${PILL}">${name}</button>`).join('');

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
