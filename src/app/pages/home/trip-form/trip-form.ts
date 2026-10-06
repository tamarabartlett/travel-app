import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import {
  toDateInputValue,
  tripFromFormValue,
} from '../../../core/trip-store.service';
import type {
  Trip,
  TripFlight,
  TripFlightFormValue,
  TripFormValue,
  TripScreenshot,
  TripTransportFormValue,
} from '../trip.types';
import {
  emptyFlightFormValue,
  emptyTransportFormValue,
} from '../trip.types';

const MAX_SCREENSHOT_BYTES = 4_000_000;

@Component({
  selector: 'app-trip-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './trip-form.html',
  styleUrl: './trip-form.scss',
})
export class TripFormComponent {
  readonly heading = input('New trip');
  readonly initialTrip = input<Trip | null>(null);

  readonly save = output<Trip>();
  readonly cancel = output<void>();

  private readonly screenshotInput =
    viewChild<ElementRef<HTMLInputElement>>('screenshotInput');

  protected readonly formError = signal<string | null>(null);
  protected readonly screenshotError = signal<string | null>(null);
  protected readonly screenshots = signal<TripScreenshot[]>([]);
  protected readonly screenshotDropActive = signal(false);

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
    transport: new FormGroup({
      drive: new FormControl(false, { nonNullable: true }),
      fly: new FormControl(false, { nonNullable: true }),
      flights: new FormArray<FormGroup>([]),
    }),
    sid: new FormControl('', { nonNullable: true }),
    roverYesNo: new FormControl<boolean | null>(null),
  });

  constructor() {
    effect(() => {
      const trip = this.initialTrip();
      if (trip) {
        this.patchFromTrip(trip);
      } else {
        this.resetEmpty();
      }
    });
  }

  protected get flightsArray(): FormArray<FormGroup> {
    return this.form.controls.transport.controls.flights;
  }

  protected onFlyChange(checked: boolean): void {
    if (checked && this.flightsArray.length === 0) {
      this.addFlight();
    }
  }

  protected addFlight(flight?: TripFlight): void {
    this.flightsArray.push(this.createFlightGroup(flight));
  }

  protected removeFlight(index: number): void {
    if (this.flightsArray.length <= 1) {
      this.flightsArray.at(0)?.reset(emptyFlightFormValue());
      return;
    }
    this.flightsArray.removeAt(index);
  }

  protected openScreenshotPicker(): void {
    this.screenshotInput()?.nativeElement.click();
  }

  protected onScreenshotInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
      void this.addScreenshotFiles(Array.from(files));
    }
    input.value = '';
  }

  protected onScreenshotDragOver(event: DragEvent): void {
    event.preventDefault();
    this.screenshotDropActive.set(true);
  }

  protected onScreenshotDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.screenshotDropActive.set(false);
  }

  protected async onScreenshotDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.screenshotDropActive.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      await this.addScreenshotFiles(Array.from(files));
    }
  }

  protected removeScreenshot(id: string): void {
    this.screenshots.update((list) => list.filter((s) => s.id !== id));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const value: TripFormValue = {
      ...raw,
      transport: raw.transport as TripTransportFormValue,
      screenshots: this.screenshots(),
    };
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

  private resetEmpty(): void {
    this.form.reset({
      name: '',
      startDate: '',
      endDate: '',
      notes: '',
      lodging: '',
      transport: emptyTransportFormValue(),
      sid: '',
      roverYesNo: null,
    });
    this.clearFlights();
    this.screenshots.set([]);
    this.screenshotError.set(null);
  }

  private patchFromTrip(trip: Trip): void {
    const transport = trip.transport;
    this.clearFlights();
    this.form.setValue({
      name: trip.name,
      startDate: toDateInputValue(trip.startDate),
      endDate: toDateInputValue(trip.endDate),
      notes: trip.notes ?? '',
      lodging: trip.lodging ?? '',
      transport: {
        drive: transport?.drive ?? false,
        fly: transport?.fly ?? false,
        flights: [],
      },
      sid: trip.sid ?? '',
      roverYesNo: trip.roverYesNo,
    });
    const flights = transport?.flights ?? [];
    if (transport?.fly && flights.length === 0) {
      this.addFlight();
    } else {
      for (const flight of flights) {
        this.addFlight(flight);
      }
    }
    this.screenshots.set(trip.screenshots ? [...trip.screenshots] : []);
    this.screenshotError.set(null);
  }

  private clearFlights(): void {
    while (this.flightsArray.length > 0) {
      this.flightsArray.removeAt(0);
    }
  }

  private createFlightGroup(flight?: TripFlight): FormGroup {
    return new FormGroup({
      fromAirport: new FormControl(flight?.fromAirport ?? '', { nonNullable: true }),
      toAirport: new FormControl(flight?.toAirport ?? '', { nonNullable: true }),
      flightNumber: new FormControl(flight?.flightNumber ?? '', { nonNullable: true }),
      company: new FormControl(flight?.company ?? '', { nonNullable: true }),
      departureTime: new FormControl(flight?.departureTime ?? '', { nonNullable: true }),
      arrivalTime: new FormControl(flight?.arrivalTime ?? '', { nonNullable: true }),
      confirmationNumber: new FormControl(flight?.confirmationNumber ?? '', {
        nonNullable: true,
      }),
    });
  }

  private async addScreenshotFiles(files: File[]): Promise<void> {
    this.screenshotError.set(null);
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      this.screenshotError.set('Only image files can be added.');
      return;
    }

    const added: TripScreenshot[] = [];
    for (const file of images) {
      if (file.size > MAX_SCREENSHOT_BYTES) {
        this.screenshotError.set(
          `"${file.name}" is too large (max ${Math.round(MAX_SCREENSHOT_BYTES / 1_000_000)} MB).`,
        );
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        added.push({
          id: newScreenshotId(),
          name: file.name,
          mimeType: file.type,
          dataUrl,
        });
      } catch {
        this.screenshotError.set(`Could not read "${file.name}".`);
      }
    }

    if (added.length) {
      this.screenshots.update((list) => [...list, ...added]);
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Invalid read result'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

function newScreenshotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
