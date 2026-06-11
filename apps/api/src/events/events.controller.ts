import { Controller, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map, type Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';

interface SseMessage {
  data: string;
}

// Figma-tarzi canli senkronizasyon: icerik degisince tum acik onizleme
// oturumlari SSE ile haberdar olur (sayfa yenilemeden tazelenir).
// SSE secimi (WebSocket degil): tek yonlu yayin yeterli, HTTP uzerinden
// calisir (proxy/CORS sorunsuz), EventSource native auto-reconnect icerir.
//
// Guvenlik: bu yonetim-ici kanaldir; JwtAuthGuard ile httpOnly access_token
// cookie'sini dogrular (EventSource header gonderemez ama cookie gonderir).
// Anonim izleyiciler baglanamaz; istemci tarafi (preview-live-sync) zarif
// dusus yapar (kirmizi nokta, sayfa yine de calisir).
@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse('content')
  @ApiOperation({
    summary: 'Icerik degisim olaylari (SSE stream, kimlik gerekli)',
  })
  content(): Observable<SseMessage> {
    return this.events.stream().pipe(map((e) => ({ data: JSON.stringify(e) })));
  }
}
