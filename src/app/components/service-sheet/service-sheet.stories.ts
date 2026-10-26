import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { Service } from '../../models/professional';
import { PHOTOS } from '../story-assets';
import { ServiceSheet } from './service-sheet';

const service: Service = {
  id: 's1',
  name: 'Maquiagem de noiva',
  category: 'Maquiagem',
  price: 450,
  durationMinutes: 150,
  description:
    'Pele, olhos e boca pensados para durar a cerimônia e a festa. Inclui teste de maquiagem e retoque no dia. Produtos de linhas profissionais e material higienizado a cada atendimento.',
  photos: PHOTOS,
  priceRules: [
    { days: [6], start: '08:00', end: '14:00', price: 520 },
    { days: [0], start: '00:00', end: '24:00', price: 580 },
  ],
};

const meta: Meta<ServiceSheet> = {
  title: 'Components/ServiceSheet',
  component: ServiceSheet,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { service, selected: false, toggled: fn(), closed: fn() },
};
export default meta;
type Story = StoryObj<ServiceSheet>;

export const Default: Story = {};

// The service is already in the booking: the button says so
export const Selected: Story = { args: { selected: true } };

// No photos and a simple price
export const WithoutPhotosOrPriceRules: Story = {
  args: { service: { ...service, photos: [], priceRules: [] } },
};
