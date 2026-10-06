import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { parseDateOnly } from '../../../core/trip-store.service';
import { TripFormComponent } from '../trip-form/trip-form';
import type { Trip } from '../trip.types';

@Component({
  selector: 'app-trip-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatIconModule, TripFormComponent],
  templateUrl: './trip-detail.html',
  styleUrl: './trip-detail.scss',
})
export class TripDetailComponent {
  readonly trip = input.required<Trip>();
  readonly editing = input(false);

  readonly startEdit = output<void>();
  readonly save = output<Trip>();
  readonly cancelEdit = output<void>();

  protected parseDate(iso: string): Date {
    return parseDateOnly(iso);
  }

  protected roverLabel(value: boolean | null): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'Not set';
  }
}
