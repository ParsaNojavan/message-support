import { Injectable } from '@nestjs/common';

@Injectable()
export class SupportService {
  getHello(): string {
    return 'Hello World!';
  }
}
