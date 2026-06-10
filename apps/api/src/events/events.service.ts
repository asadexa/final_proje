import { Injectable } from '@nestjs/common';
import { Subject, type Observable } from 'rxjs';

// Icerik degisim olayi (SSE ile yayinlanir). Yalniz kimliksiz meta tasir
// (id/slug/aksiyon) — icerigin kendisi degil; istemci gerekirse tazeler.
export interface ContentEvent {
  action: 'update' | 'publish' | 'delete' | 'restore' | 'create';
  entryId: string;
  slug?: string;
  localeCode?: string;
  // degisen blok tipleri (yalniz degisen veri gonderilir — optimizasyon)
  changedBlocks?: string[];
  at: string;
}

@Injectable()
export class EventsService {
  private readonly subject = new Subject<ContentEvent>();

  emit(event: Omit<ContentEvent, 'at'>): void {
    this.subject.next({ ...event, at: new Date().toISOString() });
  }

  stream(): Observable<ContentEvent> {
    return this.subject.asObservable();
  }
}
