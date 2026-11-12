import { TestBed } from '@angular/core/testing';
import { Feedback } from './feedback';

describe('Feedback', () => {
  let feedback: Feedback;

  beforeEach(() => {
    vi.useFakeTimers();
    feedback = TestBed.inject(Feedback);
  });

  afterEach(() => vi.useRealTimers());

  const texts = () => feedback.items().map((item) => item.text);

  it('shows a message that comes right after another one, both at once', () => {
    feedback.show('Primeira');
    feedback.show('Segunda');
    expect(texts()).toEqual(['Primeira', 'Segunda']);
    expect(feedback.text()).toBe('Segunda');
  });

  it('takes each message away on its own time', () => {
    feedback.show('Curta', 1000);
    feedback.show('Longa', 5000);
    vi.advanceTimersByTime(1500);
    expect(texts()).toEqual(['Longa']);
    vi.advanceTimersByTime(4000);
    expect(texts()).toEqual([]);
  });

  it('keeps one message for the same text, for a little longer', () => {
    feedback.show('Salvo', 1000);
    vi.advanceTimersByTime(800);
    feedback.show('Salvo', 1000);
    vi.advanceTimersByTime(800);
    expect(texts()).toEqual(['Salvo']);
    vi.advanceTimersByTime(300);
    expect(texts()).toEqual([]);
  });

  it('closes one message with its id, or all of them', () => {
    feedback.show('A');
    feedback.show('B');
    feedback.dismiss(feedback.items()[0].id);
    expect(texts()).toEqual(['B']);
    feedback.dismiss();
    expect(texts()).toEqual([]);
  });

  it('drops the oldest when there are too many', () => {
    ['1', '2', '3', '4', '5'].forEach((text) => feedback.show(text));
    expect(texts()).toEqual(['2', '3', '4', '5']);
  });
});
