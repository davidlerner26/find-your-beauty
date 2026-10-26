import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { Toast } from './toast';

const meta: Meta<Toast> = {
  title: 'Components/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: { text: 'Alterações salvas', dismiss: fn() },
};
export default meta;
type Story = StoryObj<Toast>;

export const Default: Story = {};

export const LongText: Story = {
  args: {
    text: 'Para publicar falta: CPF, foto, endereço e pelo menos 1 serviço completo com preço e duração.',
  },
};
