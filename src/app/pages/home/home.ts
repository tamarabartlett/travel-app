import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs/operators';
import { APP_VERSION } from '../../../app-version.generated';
import { AuthService } from '../../core/auth.service';
import {
  TRIP_HISTORY_FILENAME,
  TripStoreService,
} from '../../core/trip-store.service';
import { TripDetailComponent } from './trip-detail/trip-detail';
import { TripFormComponent } from './trip-form/trip-form';
import { TripListComponent } from './trip-list/trip-list';
import type { Trip } from './trip.types';

const SIDENAV_BREAKPOINT = '(min-width: 960px)';
const TOOLBAR_COMPACT_BREAKPOINT = '(max-width: 600px)';

type MainPane = 'idle' | 'new' | 'detail';

@Component({
  selector: 'app-home',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    TripListComponent,
    TripFormComponent,
    TripDetailComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly store = inject(TripStoreService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly appVersion = APP_VERSION;
  protected readonly trips = this.store.trips;
  protected readonly storeReady = this.store.ready;
  protected readonly storeLoadError = this.store.loadError;
  protected readonly storeSaveError = this.store.saveError;

  protected readonly statusMessage = signal<string | null>(null);
  protected readonly statusKind = signal<'info' | 'error'>('info');

  protected readonly selectedTripId = signal<string | null>(null);
  protected readonly selectedTrip = computed<Trip | null>(() => {
    const id = this.selectedTripId();
    if (!id) return null;
    return this.trips().find((t) => t.id === id) ?? null;
  });

  protected readonly mainPane = signal<MainPane>('idle');
  protected readonly detailEditing = signal(false);

  protected readonly isWideScreen = toSignal(
    this.breakpointObserver
      .observe(SIDENAV_BREAKPOINT)
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly isCompactToolbar = toSignal(
    this.breakpointObserver
      .observe(TOOLBAR_COMPACT_BREAKPOINT)
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly sidenavMode = computed(() =>
    this.isWideScreen() ? 'side' : 'over',
  );

  protected readonly sidenavOpened = linkedSignal(() => this.isWideScreen());

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  ngOnInit(): void {
    void this.store.ensureLoaded();
  }

  protected toggleSidenav(): void {
    this.sidenavOpened.update((v) => !v);
  }

  protected onSidenavOpenedChange(opened: boolean): void {
    this.sidenavOpened.set(opened);
  }

  protected goHome(): void {
    this.selectedTripId.set(null);
    this.mainPane.set('idle');
    this.detailEditing.set(false);
    this.closeSidenavIfOverlay();
  }

  protected startNewTrip(): void {
    this.selectedTripId.set(null);
    this.detailEditing.set(false);
    this.mainPane.set('new');
    this.closeSidenavIfOverlay();
  }

  protected selectTrip(id: string): void {
    this.selectedTripId.set(id);
    this.detailEditing.set(false);
    this.mainPane.set('detail');
    this.closeSidenavIfOverlay();
  }

  protected onNewTripSaved(trip: Trip): void {
    this.store.addTrip(trip);
    this.flashStatus('info', `Saved trip “${trip.name}”.`);
    this.selectedTripId.set(trip.id);
    this.detailEditing.set(false);
    this.mainPane.set('detail');
  }

  protected onNewTripCancelled(): void {
    this.mainPane.set('idle');
  }

  protected onDetailSave(trip: Trip): void {
    this.store.updateTrip(trip);
    this.flashStatus('info', `Updated trip “${trip.name}”.`);
    this.detailEditing.set(false);
  }

  protected onDetailCancelEdit(): void {
    this.detailEditing.set(false);
  }

  protected exportHistory(): void {
    const json = JSON.stringify(this.store.toHistoryFile(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = TRIP_HISTORY_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.flashStatus('info', `Exported ${this.trips().length} trip(s).`);
  }

  protected triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await this.store.ensureLoaded();
      const text = await file.text();
      const imported = this.store.parseHistoryText(text);
      await this.store.replaceAll(imported);
      this.flashStatus('info', `Imported ${imported.length} trip(s).`);
      this.selectedTripId.set(null);
      this.mainPane.set('idle');
      this.detailEditing.set(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error.';
      this.flashStatus('error', `Import failed: ${message}`);
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  protected dismissStatus(): void {
    this.statusMessage.set(null);
  }

  private flashStatus(kind: 'info' | 'error', message: string): void {
    this.statusKind.set(kind);
    this.statusMessage.set(message);
  }

  private closeSidenavIfOverlay(): void {
    if (!this.isWideScreen()) this.sidenavOpened.set(false);
  }
}
