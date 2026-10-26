import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { PlaceSuggestion } from '../../utils/place-search';
import { PlaceSuggestions } from './place-suggestions';

// The list of the address field: only the text is shown, so a made up prediction is enough
const suggestion = (text: string) => ({ text, prediction: {} }) as unknown as PlaceSuggestion;

const meta: Meta<PlaceSuggestions> = {
  title: 'Components/PlaceSuggestions',
  component: PlaceSuggestions,
  tags: ['autodocs'],
  // The list sits under an input, in a box with `position: relative`
  decorators: [
    (story) => {
      const rendered = story();
      return {
        ...rendered,
        template: `<div style="position: relative; width: 340px; height: 260px">${rendered.template}</div>`,
      };
    },
  ],
  args: { pick: fn() },
};
export default meta;
type Story = StoryObj<PlaceSuggestions>;

export const Default: Story = {
  args: {
    suggestions: [
      suggestion('Rua das Flores, 100 - Botafogo, Rio de Janeiro - RJ'),
      suggestion('Rua das Laranjeiras, 20 - Laranjeiras, Rio de Janeiro - RJ'),
      suggestion('Avenida Atlântica, 1500 - Copacabana, Rio de Janeiro - RJ'),
    ],
  },
};

// Nothing found: the list is not shown
export const Empty: Story = { args: { suggestions: [] } };
