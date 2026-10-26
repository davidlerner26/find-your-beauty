import type { Meta, StoryObj } from '@storybook/angular-vite';
import { PHOTOS } from '../story-assets';
import { CarouselArrows } from './carousel-arrows';

const meta: Meta<CarouselArrows> = {
  title: 'Components/CarouselArrows',
  component: CarouselArrows,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<CarouselArrows>;

// The arrows scroll the strip they are given, and go around at the ends
export const OverAStripOfPhotos: Story = {
  render: () => ({
    props: { photos: PHOTOS },
    template: `
      <div style="position: relative; width: 320px">
        <div #strip tabindex="0" role="group" aria-label="Fotos" style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory">
          @for (photo of photos; track photo) {
            <img [src]="photo" alt="Foto de exemplo" style="width: 320px; flex: none; scroll-snap-align: start" />
          }
        </div>
        <app-carousel-arrows [target]="strip" />
      </div>
    `,
  }),
};
