import { Pipe, PipeTransform } from '@angular/core';
import { ImagePosition } from '../models/professional';

// Focal point -> CSS position, for background-position and object-position. Centered by default.
@Pipe({ name: 'focus' })
export class FocusPipe implements PipeTransform {
  transform(position: ImagePosition | null | undefined) {
    return `${position?.x ?? 50}% ${position?.y ?? 50}%`;
  }
}
