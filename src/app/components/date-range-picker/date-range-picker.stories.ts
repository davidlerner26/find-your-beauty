import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { toDateKey } from '../../utils/slots';
import { DateRangePicker } from './date-range-picker';

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
};

const meta: Meta<DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { rangeChange: fn() },
};
export default meta;
type Story = StoryObj<DateRangePicker>;

export const Empty: Story = {};

// Days before `min` cannot be picked, and the arrow does not go back past that month
export const FromToday: Story = { args: { min: day(0) } };

export const WithAPeriodSelected: Story = {
  args: { min: day(0), range: { start: day(2), end: day(5) } },
};

// Periods that are already blocked show as a band
export const WithBlockedPeriods: Story = {
  args: {
    min: day(0),
    blocked: [
      { start: day(3), end: day(6) },
      { start: day(10), end: day(10) },
    ],
  },
};
