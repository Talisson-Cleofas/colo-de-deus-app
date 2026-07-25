import { Injectable } from '@nestjs/common';
import type { LectioSource } from './lectio.types';
import { SemanticStateMachineParser } from './semantic-state-machine.parser';

/**
 * Fachada mantida para compatibilidade com os providers existentes.
 * A interpretação real passou a ser feita pela máquina de estados.
 */
@Injectable()
export class SemanticLectioParser {
  constructor(private readonly stateMachine: SemanticStateMachineParser) {}

  normalizeHtml(html: string): string {
    return this.stateMachine.normalizeHtmlToLines(html).join('\n');
  }

  parse(html: string, date: string, source: LectioSource) {
    return this.stateMachine.parse(html, date, source);
  }
}
