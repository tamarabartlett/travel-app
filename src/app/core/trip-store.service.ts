import { Injectable, inject, signal } from '@angular/core';
import type {
  Trip,
  TripFlight,
  TripFlightFormValue,
  TripFormValue,
  TripHistoryFile,
  TripScreenshot,
  TripTransport,
} from '../pages/home/trip.types';
import { TripApiService } from './trip-api.service';

export const TRIP_HISTORY_VERSION = 1;
export const TRIP_HISTORY_FILENAME = 'tripHistory.json';

const STORAGE_KEY = 'travel_trips_v1';

@Injectable({ providedIn: 'root' })
export class TripStoreService {
  private readonly api = inject(TripApiService);

  private readonly _trips = signal<Trip[]>([]);
  readonly trips = this._trips.asReadonly();

  readonly ready = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  private loadPromise: Promise<void> | null = null;

  ensureLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.initFromApi();
    }
    return this.loadPromise;
  }

  private async initFromApi(): Promise<void> {
    try {
      const data = await this.api.fetchTrips();
      let trips = data.trips.map((t) => normalizeTripFromApi(t));

      if (trips.length === 0) {
        const local = this.readLocalStorage();
        if (local) {
          trips = local;
          await this.api.saveTrips(trips);
        }
      }

      this._trips.set(sortTrips(trips));
      this.loadError.set(null);
    } catch (err) {
      const local = this.readLocalStorage();
      if (local) {
        this._trips.set(sortTrips(local));
        this.loadError.set(null);
      } else {
        const message =
          err instanceof Error ? err.message : 'Could not load trips.';
        this.loadError.set(message);
      }
    } finally {
      this.ready.set(true);
    }
  }

  addTrip(trip: Trip): void {
    this._trips.update((list) => sortTrips([trip, ...list]));
    void this.persist();
  }

  updateTrip(trip: Trip): void {
    this._trips.update((list) =>
      sortTrips(list.map((t) => (t.id === trip.id ? trip : t))),
    );
    void this.persist();
  }

  async replaceAll(trips: Trip[]): Promise<void> {
    if (!this.ready()) {
      await this.ensureLoaded();
    }
    this._trips.set(sortTrips(trips.map((t) => normalizeTripFromApi(t))));
    await this.persistAndSync();
  }

  toHistoryFile(): TripHistoryFile {
    return {
      version: TRIP_HISTORY_VERSION,
      exportedAt: new Date().toISOString(),
      trips: this._trips(),
    };
  }

  parseHistoryText(text: string): Trip[] {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('File is not valid JSON.');
    }
    return normalizeHistory(raw);
  }

  private persist(): void {
    this.writeLocalStorage();
    void this.syncToApi().catch(() => {});
  }

  private async persistAndSync(): Promise<void> {
    this.writeLocalStorage();
    await this.syncToApi();
  }

  private async syncToApi(): Promise<void> {
    try {
      await this.api.saveTrips(this._trips());
      this.saveError.set(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save trips.';
      this.saveError.set(message);
      throw err;
    }
  }

  private writeLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toHistoryFile()));
    } catch {
      // quota / privacy mode
    }
  }

  private readLocalStorage(): Trip[] | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return normalizeHistory(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}

export function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPastTrip(trip: Trip, today = startOfTodayLocal()): boolean {
  const end = parseDateOnly(trip.endDate);
  end.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime();
}

export function parseDateOnly(iso: string): Date {
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(NaN);
}

export function toDateInputValue(iso: string): string {
  const d = parseDateOnly(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function dateInputToIso(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toISOString();
}

export function tripFromFormValue(value: TripFormValue, existingId?: string): Trip {
  const name = value.name.trim();
  if (!name) throw new Error('Trip name is required.');
  if (!value.startDate || !value.endDate) {
    throw new Error('Start and end dates are required.');
  }
  const start = parseDateOnly(value.startDate);
  const end = parseDateOnly(value.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date.');
  }
  if (end.getTime() < start.getTime()) {
    throw new Error('End date must be on or after start date.');
  }

  const notes = value.notes.trim();
  const lodging = value.lodging.trim();
  const sid = value.sid.trim();
  const trip: Trip = {
    id: existingId ?? newId(),
    name,
    startDate: dateInputToIso(value.startDate),
    endDate: dateInputToIso(value.endDate),
    roverYesNo: value.roverYesNo,
  };
  if (notes) trip.notes = notes;
  if (lodging) trip.lodging = lodging;
  const transport = transportFromFormValue(value.transport);
  if (transport) trip.transport = transport;
  const screenshots = normalizeScreenshots(value.screenshots);
  if (screenshots.length) trip.screenshots = screenshots;
  if (sid) trip.sid = sid;
  return trip;
}

function sortTrips(list: Trip[]): Trip[] {
  return [...list].sort(
    (a, b) => parseDateOnly(b.startDate).getTime() - parseDateOnly(a.startDate).getTime(),
  );
}

function normalizeTripFromApi(t: Trip): Trip {
  return {
    ...t,
    startDate: new Date(t.startDate).toISOString(),
    endDate: new Date(t.endDate).toISOString(),
    roverYesNo: t.roverYesNo === true ? true : t.roverYesNo === false ? false : null,
    transport: normalizeTransportRaw(t.transport),
    screenshots: normalizeScreenshots(t.screenshots),
  };
}

function normalizeHistory(raw: unknown): Trip[] {
  const tripsRaw: unknown = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray((raw as { trips?: unknown }).trips)
      ? (raw as { trips: unknown[] }).trips
      : null;

  if (!Array.isArray(tripsRaw)) {
    throw new Error(
      'Expected an object with a "trips" array, or a bare array of trips.',
    );
  }

  return tripsRaw.map((t, i) => normalizeTrip(t, i));
}

function normalizeTrip(raw: unknown, index: number): Trip {
  if (!isRecord(raw)) {
    throw new Error(`trips[${index}] is not an object.`);
  }
  const name = raw['name'];
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error(`trips[${index}].name is required.`);
  }
  const startDate = raw['startDate'];
  const endDate = raw['endDate'];
  if (typeof startDate !== 'string' || Number.isNaN(Date.parse(startDate))) {
    throw new Error(`trips[${index}].startDate must be an ISO date string.`);
  }
  if (typeof endDate !== 'string' || Number.isNaN(Date.parse(endDate))) {
    throw new Error(`trips[${index}].endDate must be an ISO date string.`);
  }
  const id = typeof raw['id'] === 'string' && raw['id'] ? raw['id'] : newId();
  const notesRaw = raw['notes'];
  const lodgingRaw = raw['lodging'];
  const transportRaw = raw['transport'];
  const screenshotsRaw = raw['screenshots'];
  const sidRaw = raw['sid'];
  const roverRaw = raw['roverYesNo'];

  const trip: Trip = {
    id,
    name: name.trim(),
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    roverYesNo:
      roverRaw === true ? true : roverRaw === false ? false : null,
  };
  if (typeof notesRaw === 'string' && notesRaw.trim()) {
    trip.notes = notesRaw.trim();
  }
  if (typeof lodgingRaw === 'string' && lodgingRaw.trim()) {
    trip.lodging = lodgingRaw.trim();
  }
  const transport = normalizeTransportRaw(transportRaw);
  if (transport) trip.transport = transport;
  const screenshots = normalizeScreenshots(screenshotsRaw);
  if (screenshots.length) trip.screenshots = screenshots;
  if (typeof sidRaw === 'string' && sidRaw.trim()) {
    trip.sid = sidRaw.trim();
  }
  return trip;
}

function transportFromFormValue(value: TripFormValue['transport']): TripTransport | undefined {
  const drive = value.drive === true;
  const fly = value.fly === true;
  const flights = fly
    ? value.flights
        .map((f) => flightFromFormValue(f))
        .filter((f): f is TripFlight => f !== null)
    : [];

  if (!drive && !fly && flights.length === 0) {
    return undefined;
  }

  const transport: TripTransport = { drive, fly, flights };

  if (fly) {
    if (value.rideToAirport === true) transport.rideToAirport = true;
    if (value.airportParking === true) transport.airportParking = true;
    if (value.toldRicho === true) transport.toldRicho = true;
    if (value.flightInSharedCalendar === true) transport.flightInSharedCalendar = true;
    const parkingReservationNumber = value.parkingReservationNumber.trim();
    if (parkingReservationNumber) {
      transport.parkingReservationNumber = parkingReservationNumber;
    }
  }

  return transport;
}

function flightFromFormValue(value: TripFlightFormValue): TripFlight | null {
  const fromAirport = value.fromAirport.trim();
  const toAirport = value.toAirport.trim();
  const flightNumber = value.flightNumber.trim();
  const company = value.company.trim();
  const departureTime = value.departureTime.trim();
  const arrivalTime = value.arrivalTime.trim();
  const confirmationNumber = value.confirmationNumber.trim();

  if (
    !fromAirport &&
    !toAirport &&
    !flightNumber &&
    !company &&
    !departureTime &&
    !arrivalTime &&
    !confirmationNumber
  ) {
    return null;
  }

  return {
    fromAirport,
    toAirport,
    flightNumber,
    company,
    departureTime,
    arrivalTime,
    confirmationNumber,
  };
}

function normalizeTransportRaw(raw: unknown): TripTransport | undefined {
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return undefined;
    return { drive: false, fly: false, flights: [], legacyText: text };
  }
  if (!isRecord(raw)) return undefined;

  const drive = raw['drive'] === true;
  const fly = raw['fly'] === true;
  const legacyText =
    typeof raw['legacyText'] === 'string' && raw['legacyText'].trim()
      ? raw['legacyText'].trim()
      : undefined;
  const flightsRaw = raw['flights'];
  const flights = Array.isArray(flightsRaw)
    ? flightsRaw
        .map((f) => normalizeFlightRaw(f))
        .filter((f): f is TripFlight => f !== null)
    : [];

  const rideToAirport = raw['rideToAirport'] === true;
  const airportParking = raw['airportParking'] === true;
  const toldRicho = raw['toldRicho'] === true;
  const flightInSharedCalendar = raw['flightInSharedCalendar'] === true;
  const parkingReservationNumber =
    typeof raw['parkingReservationNumber'] === 'string'
      ? raw['parkingReservationNumber'].trim()
      : '';

  if (
    !drive &&
    !fly &&
    flights.length === 0 &&
    !legacyText &&
    !rideToAirport &&
    !airportParking &&
    !toldRicho &&
    !flightInSharedCalendar &&
    !parkingReservationNumber
  ) {
    return undefined;
  }

  const transport: TripTransport = { drive, fly, flights, legacyText };
  if (rideToAirport) transport.rideToAirport = true;
  if (airportParking) transport.airportParking = true;
  if (toldRicho) transport.toldRicho = true;
  if (flightInSharedCalendar) transport.flightInSharedCalendar = true;
  if (parkingReservationNumber) {
    transport.parkingReservationNumber = parkingReservationNumber;
  }

  return transport;
}

function normalizeFlightRaw(raw: unknown): TripFlight | null {
  if (!isRecord(raw)) return null;
  const fromAirport =
    typeof raw['fromAirport'] === 'string' ? raw['fromAirport'].trim() : '';
  const toAirport =
    typeof raw['toAirport'] === 'string' ? raw['toAirport'].trim() : '';
  const flightNumber =
    typeof raw['flightNumber'] === 'string' ? raw['flightNumber'].trim() : '';
  const company = typeof raw['company'] === 'string' ? raw['company'].trim() : '';
  const departureTime =
    typeof raw['departureTime'] === 'string' ? raw['departureTime'].trim() : '';
  const arrivalTime =
    typeof raw['arrivalTime'] === 'string' ? raw['arrivalTime'].trim() : '';
  const confirmationNumber =
    typeof raw['confirmationNumber'] === 'string'
      ? raw['confirmationNumber'].trim()
      : '';

  if (
    !fromAirport &&
    !toAirport &&
    !flightNumber &&
    !company &&
    !departureTime &&
    !arrivalTime &&
    !confirmationNumber
  ) {
    return null;
  }

  return {
    fromAirport,
    toAirport,
    flightNumber,
    company,
    departureTime,
    arrivalTime,
    confirmationNumber,
  };
}

function normalizeScreenshots(raw: unknown): TripScreenshot[] {
  if (!Array.isArray(raw)) return [];
  const out: TripScreenshot[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const dataUrl = item['dataUrl'];
    const mimeType = item['mimeType'];
    const name = item['name'];
    const id = item['id'];
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue;
    if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) continue;
    out.push({
      id: typeof id === 'string' && id ? id : newId(),
      name: typeof name === 'string' && name ? name : 'Screenshot',
      mimeType,
      dataUrl,
    });
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
