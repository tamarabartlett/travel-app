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
import type { Trip, TripFlight, TripTransport } from '../trip.types';

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

  protected hasTransport(transport: TripTransport | undefined): boolean {
    if (!transport) return false;
    return (
      transport.drive ||
      transport.fly ||
      (transport.flights?.length ?? 0) > 0 ||
      !!transport.legacyText
    );
  }

  protected transportModes(transport: TripTransport): string {
    const modes: string[] = [];
    if (transport.drive) modes.push('Drive');
    if (transport.fly) modes.push('Fly');
    return modes.length ? modes.join(', ') : '—';
  }

  protected formatFlightTime(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
    return value;
  }

  protected flightRows(flight: TripFlight): { label: string; value: string }[] {
    return [
      { label: 'From', value: flight.fromAirport || '—' },
      { label: 'To', value: flight.toAirport || '—' },
      { label: 'Flight #', value: flight.flightNumber || '—' },
      { label: 'Company', value: flight.company || '—' },
      { label: 'Departure', value: this.formatFlightTime(flight.departureTime) },
      { label: 'Arrival', value: this.formatFlightTime(flight.arrivalTime) },
      { label: 'Confirmation', value: flight.confirmationNumber || '—' },
    ];
  }
}
