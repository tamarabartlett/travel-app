export interface TripFlight {
  fromAirport: string;
  toAirport: string;
  flightNumber: string;
  company: string;
  departureTime: string;
  arrivalTime: string;
  confirmationNumber: string;
}

export interface TripTransport {
  drive: boolean;
  fly: boolean;
  flights: TripFlight[];
  rideToAirport?: boolean;
  airportParking?: boolean;
  toldRicho?: boolean;
  flightInSharedCalendar?: boolean;
  parkingReservationNumber?: string;
  /** Migrated from the legacy free-text transport field. */
  legacyText?: string;
}

export interface TripScreenshot {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface Trip {
  id: string;
  name: string;
  /** ISO date string (calendar day in local use). */
  startDate: string;
  endDate: string;
  notes?: string;
  lodging?: string;
  transport?: TripTransport;
  screenshots?: TripScreenshot[];
  /** Free-text “Sid” section (e.g. pet / Rover details). */
  sid?: string;
  /** Yes/No for Rover (or similar); null = unset. */
  roverYesNo: boolean | null;
  /** Yes/No for Richo; null = unset. */
  richoYesNo: boolean | null;
}

export interface TripHistoryFile {
  version: number;
  exportedAt: string;
  trips: Trip[];
}

export interface TripFlightFormValue {
  fromAirport: string;
  toAirport: string;
  flightNumber: string;
  company: string;
  departureTime: string;
  arrivalTime: string;
  confirmationNumber: string;
}

export interface TripTransportFormValue {
  drive: boolean;
  fly: boolean;
  flights: TripFlightFormValue[];
  rideToAirport: boolean;
  airportParking: boolean;
  toldRicho: boolean;
  flightInSharedCalendar: boolean;
  parkingReservationNumber: string;
}

/** Form value shape (dates as yyyy-MM-dd from date inputs). */
export interface TripFormValue {
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  lodging: string;
  transport: TripTransportFormValue;
  sid: string;
  roverYesNo: boolean | null;
  richoYesNo: boolean | null;
  screenshots: TripScreenshot[];
}

export function emptyFlightFormValue(): TripFlightFormValue {
  return {
    fromAirport: '',
    toAirport: '',
    flightNumber: '',
    company: '',
    departureTime: '',
    arrivalTime: '',
    confirmationNumber: '',
  };
}

export function emptyTransportFormValue(): TripTransportFormValue {
  return {
    drive: false,
    fly: false,
    flights: [],
    rideToAirport: false,
    airportParking: false,
    toldRicho: false,
    flightInSharedCalendar: false,
    parkingReservationNumber: '',
  };
}
