import { Controller, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { map, type Observable } from 'rxjs';
import { EventsService } from './events.service';

interface SseMessage {
  data: string;
}

// Figma-tarzi canli senkronizasyon: icerik degisince tum acik onizleme
// oturumlari SSE ile haberdar olur (sayfa yenilemeden tazelenir).
// SSE secimi (WebSocket degil): tek yonlu yayin yeterli, HTTP uzerinden
// calisir (proxy/CORS sorunsuz), EventSource native auto-reconnect icerir.
@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse('content')
  @ApiOperation({ summary: 'Icerik degisim olaylari (SSE stream)' })
  content(): Observable<SseMessage> {
    return this.events.stream().pipe(map((e) => ({ data: JSON.stringify(e) })));
  }
}
