import { Pipe, PipeTransform } from '@angular/core';

// 1 -> "avaliação", anything else -> "avaliações"
@Pipe({ name: 'reviewsLabel' })
export class ReviewsLabelPipe implements PipeTransform {
  transform(count: string | number | null | undefined) {
    return Number(count) === 1 ? $localize`avaliação` : $localize`avaliações`;
  }
}
