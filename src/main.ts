import { NestFactory } from '@nestjs/core';
import { SupportModule } from './support.module';

async function bootstrap() {
  const app = await NestFactory.create(SupportModule);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
