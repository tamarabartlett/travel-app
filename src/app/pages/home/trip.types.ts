export interface Trip {
  id: string;
  name: string;
  /** ISO date string (calendar day in local use). */
  startDate: string;
  endDate: string;
  notes?: string;
  lodging?: string;
  transport?: string;
  /** Free-text “Sid” section (e.g. pet / Rover details). */
  sid?: string;
  /** Yes/No for Rover (or similar); null = unset. */
  roverYesNo: boolean | null;
}

export interface TripHistoryFile {
  version: number;
  exportedAt: string;
  trips: Trip[];
}

/** Form value shape (dates as yyyy-MM-dd from date inputs). */
export interface TripFormValue {
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  lodging: string;
  transport: string;
  sid: string;
  roverYesNo: boolean | null;
}
