import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContentService } from './content.service';

// Zamanlanmis yayin worker'i: periyodik olarak publishAt'i gelmis SCHEDULED
// icerikleri yayinlar (status -> PUBLISHED). 30sn granularite zamanlanmis icerik icin yeterli.
@Injectable()
export class PublishScheduler {
  private readonly logger = new Logger(PublishScheduler.name);

  constructor(private readonly content: ContentService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handle(): Promise<void> {
    const count = await this.content.runScheduledPublish();
    if (count > 0) {
      this.logger.log(`Zamanlanmis yayin: ${count} icerik yayinlandi.`);
    }
  }
}
