import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { isPastTrip, parseDateOnly, TripStoreService } from '../../../core/trip-store.service';
import type { Trip } from '../trip.types';

type MainPane = 'idle' | 'new' | 'detail';

@Component({
  selector: 'app-trip-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule],
  templateUrl: './trip-list.html',
  styleUrl: './trip-list.scss',
})
export class TripListComponent {
  private readonly store = inject(TripStoreService);

  readonly selectedTripId = input<string | null>(null);
  readonly mainPane = input<MainPane>('idle');

  readonly selectTrip = output<string>();

  protected readonly upcoming = computed(() =>
    this.store.trips().filter((t) => !isPastTrip(t)),
  );

  protected readonly past = computed(() =>
    this.store.trips().filter((t) => isPastTrip(t)),
  );

  protected parseDate(iso: string): Date {
    return parseDateOnly(iso);
  }

  protected isActive(trip: Trip): boolean {
    return (
      this.mainPane() === 'detail' &&
      this.selectedTripId() === trip.id
    );
  }
}
