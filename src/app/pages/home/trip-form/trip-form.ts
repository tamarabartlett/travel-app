import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import {
  toDateInputValue,
  tripFromFormValue,
} from '../../../core/trip-store.service';
import type { Trip, TripFormValue } from '../trip.types';

@Component({
  selector: 'app-trip-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
  ],
  templateUrl: './trip-form.html',
  styleUrl: './trip-form.scss',
})
export class TripFormComponent {
  readonly heading = input('New trip');
  readonly initialTrip = input<Trip | null>(null);

  readonly save = output<Trip>();
  readonly cancel = output<void>();

  protected readonly formError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true }),
    lodging: new FormControl('', { nonNullable: true }),
    transport: new FormControl('', { nonNullable: true }),
    sid: new FormControl('', { nonNullable: true }),
    roverYesNo: new FormControl<boolean | null>(null),
  });

  constructor() {
    effect(() => {
      const trip = this.initialTrip();
      if (trip) {
        this.patchFromTrip(trip);
      } else {
        this.form.reset({
          name: '',
          startDate: '',
          endDate: '',
          notes: '',
          lodging: '',
          transport: '',
          sid: '',
          roverYesNo: null,
        });
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue() as TripFormValue;
    this.formError.set(null);
    try {
      const trip = tripFromFormValue(value, this.initialTrip()?.id);
      this.save.emit(trip);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save trip.';
      this.formError.set(message);
    }
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  private patchFromTrip(trip: Trip): void {
    this.form.setValue({
      name: trip.name,
      startDate: toDateInputValue(trip.startDate),
      endDate: toDateInputValue(trip.endDate),
      notes: trip.notes ?? '',
      lodging: trip.lodging ?? '',
      transport: trip.transport ?? '',
      sid: trip.sid ?? '',
      roverYesNo: trip.roverYesNo,
    });
  }
}
