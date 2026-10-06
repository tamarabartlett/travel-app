import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Trip } from '../pages/home/trip.types';

export interface TripDataResponse {
  trips: Trip[];
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class TripApiService {
  private readonly http = inject(HttpClient);

  fetchTrips(): Promise<TripDataResponse> {
    return firstValueFrom(this.http.get<TripDataResponse>('/api/trips'));
  }

  saveTrips(trips: Trip[]): Promise<void> {
    return firstValueFrom(this.http.put<void>('/api/trips', { trips }));
  }
}
