import { Controller, Get } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  getHello(): string {
    return this.supportService.getHello();
  }
}
