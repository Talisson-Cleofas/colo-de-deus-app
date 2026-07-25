import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { LectioEntry, LectioSource } from './lectio.types';

type ParsedLectio = Omit<
  LectioEntry,
  'id' | 'status' | 'protected' | 'syncedAt' | 'updatedAt' | 'active' | 'reflection' | 'prayer'
>;

type Section = 'NONE' | 'FIRST' | 'PSALM' | 'SECOND' | 'ACCLAMATION' | 'GOSPEL';
type SectionBuckets = Record<Exclude<Section, 'NONE'>, string[]>;

type Candidate = {
  buckets: SectionBuckets;
  headingReferences: Partial<Record<Exclude<Section, 'NONE'>, string>>;
  score: number;
};

@Injectable()
export class SemanticStateMachineParser {
  private readonly footerMarkers = [
    /Conferência Nacional dos Bispos do Brasil/i,
    /©\s*Todos os direitos reservados/i,
    /Ajude a Canção Nova/i,
    /Pedido de Oraç(?:ão|ao)/i,
    /Aplicativo Liturgia Diária/i,
    /Compartilhe/i,
    /Santo do Dia/i,
    /Política de Privacidade/i,
  ];

  private decode(value: string): string {
    const named: Record<string, string> = {
      amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>',
      aacute: 'á', Aacute: 'Á', eacute: 'é', Eacute: 'É', iacute: 'í', Iacute: 'Í',
      oacute: 'ó', Oacute: 'Ó', uacute: 'ú', Uacute: 'Ú', atilde: 'ã', Atilde: 'Ã',
      otilde: 'õ', Otilde: 'Õ', ccedil: 'ç', Ccedil: 'Ç', acirc: 'â', Acirc: 'Â',
      ecirc: 'ê', Ecirc: 'Ê', ocirc: 'ô', Ocirc: 'Ô', agrave: 'à', Agrave: 'À',
      ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
    };
    return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
      if (entity.toLowerCase().startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return named[entity] ?? `&${entity};`;
    });
  }

  normalizeHtmlToLines(html: string): string[] {
    const clean = html
      .replace(/<!--([\s\S]*?)-->/g, ' ')
      .replace(/<(script|style|noscript|svg|nav|footer|aside|form|button)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|section|article|main|h[1-6]|li|tr|td|blockquote|figure)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    const decoded = this.decode(clean)
      .normalize('NFC')
      .replace(/\r/g, '')
      // Alguns provedores entregam o título da seção e o conteúdo no mesmo bloco.
      // Inserimos limites semânticos antes de quebrar em linhas.
      .replace(/\s+(?=(?:Primeira Leitura|1\s*[ªa]\s*Leitura|Segunda Leitura|2\s*[ªa]\s*Leitura|Salmo Responsorial|Salmo|Responsório|Responsorio|Aclamação(?: ao Evangelho)?|Aclamacao(?: ao Evangelho)?|(?<!do )(?<!ao )Evangelho)\b)/gi, '\n')
      .replace(/((?:Primeira Leitura|1\s*[ªa]\s*Leitura|Segunda Leitura|2\s*[ªa]\s*Leitura|Salmo Responsorial|Responsório|Responsorio|Aclamação(?: ao Evangelho)?|Aclamacao(?: ao Evangelho)?|(?<!do )(?<!ao )Evangelho)\s*(?:\([^\n)]{1,100}\))?)/gi, '\n$1\n')
      // Não quebrar antes de "palavra do Senhor" de forma genérica: a expressão
      // também aparece dentro da própria leitura (ex.: "A palavra do Senhor foi...").
      ;
    const lines = decoded
      .split('\n')
      .map((line) => line.replace(/[\t ]+/g, ' ').trim())
      .filter(Boolean);

    const footerIndex = lines.findIndex((line) => this.footerMarkers.some((marker) => marker.test(line)));
    return (footerIndex >= 0 ? lines.slice(0, footerIndex) : lines)
      .filter((line) => !/^(menu|buscar|home|início|voltar|próximo|anterior)$/i.test(line));
  }

  private normalizeForMatch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private classifyHeading(line: string): { section: Exclude<Section, 'NONE'>; reference: string } | null {
    if (line.length > 260) return null;
    const normalized = this.normalizeForMatch(line);

    const identify = (
      pattern: RegExp,
      section: Exclude<Section, 'NONE'>,
    ): { section: Exclude<Section, 'NONE'>; reference: string } | null => {
      const match = pattern.exec(normalized);
      if (!match) return null;

      // Remove o rótulo usando a quantidade de palavras reconhecida no texto
      // normalizado. A referência pode vir entre parênteses ou diretamente após
      // o título: "1ª Leitura Mq 7,14-15".
      const labelPatterns: Record<Exclude<Section, 'NONE'>, RegExp> = {
        FIRST: /^(?:primeira leitura|1\s*[ªa]\s*leitura)\s*/i,
        PSALM: /^(?:salmo responsorial|salmo|respons[oó]rio)\s*/i,
        SECOND: /^(?:segunda leitura|2\s*[ªa]\s*leitura)\s*/i,
        ACCLAMATION: /^aclama[cç][aã]o(?: ao evangelho)?\s*/i,
        GOSPEL: /^evangelho\s*/i,
      };
      const remainder = line
        .replace(labelPatterns[section], '')
        .replace(/^[:.-–—]+\s*/, '')
        .trim();
      const unwrapped = remainder.replace(/^\(([^)]+)\)\s*[:.-–—]?$/, '$1').trim();
      const reference = this.referenceFrom(unwrapped) || (unwrapped.length <= 100 && /\d/.test(unwrapped) ? unwrapped : '');
      return { section, reference };
    };

    return identify(/^(primeira leitura|1\s*[ªa]\s*leitura)\b/, 'FIRST')
      ?? identify(/^(salmo responsorial|salmo|responsorio)\b/, 'PSALM')
      ?? identify(/^(segunda leitura|2\s*[ªa]\s*leitura)\b/, 'SECOND')
      ?? identify(/^aclamacao(?: ao evangelho)?\b/, 'ACCLAMATION')
      ?? identify(/^evangelho\b/, 'GOSPEL');
  }

  private sectionOrder(section: Exclude<Section, 'NONE'>): number {
    return { FIRST: 1, PSALM: 2, SECOND: 3, ACCLAMATION: 4, GOSPEL: 5 }[section];
  }

  private emptyBuckets(): SectionBuckets {
    return { FIRST: [], PSALM: [], SECOND: [], ACCLAMATION: [], GOSPEL: [] };
  }

  private candidateFrom(lines: string[], startIndex: number): Candidate {
    const buckets = this.emptyBuckets();
    const headingReferences: Candidate['headingReferences'] = {};
    let state: Section = 'NONE';
    let highestOrder = 0;

    for (let index = startIndex; index < lines.length; index += 1) {
      const line = lines[index];
      const heading = this.classifyHeading(line);
      if (heading) {
        const order = this.sectionOrder(heading.section);
        if (heading.section === 'FIRST' && index !== startIndex) {
          // A Canção Nova pode repetir o cabeçalho da primeira leitura em nós
          // consecutivos (link do menu + título visível). Enquanto nenhum conteúdo
          // real foi coletado, tratamos o novo cabeçalho como continuação do mesmo
          // bloco, preservando a melhor referência disponível.
          const hasCollectedContent = Object.values(buckets).some((bucket) => bucket.length > 0);
          if (!hasCollectedContent) {
            state = 'FIRST';
            highestOrder = 1;
            if (heading.reference) headingReferences.FIRST = heading.reference;
            continue;
          }
          break;
        }
        if (order < highestOrder) continue;
        if (order === highestOrder) {
          if (!headingReferences[heading.section] && heading.reference) headingReferences[heading.section] = heading.reference;
          continue;
        }
        state = heading.section;
        highestOrder = order;
        if (heading.reference) headingReferences[heading.section] = heading.reference;
        continue;
      }
      if (state !== 'NONE') buckets[state].push(line);
    }

    const contentScore =
      buckets.FIRST.join(' ').length +
      buckets.PSALM.join(' ').length +
      buckets.GOSPEL.join(' ').length +
      Math.min(500, buckets.ACCLAMATION.join(' ').length);
    const requiredBonus = (buckets.FIRST.length ? 1000 : 0) + (buckets.PSALM.length ? 1000 : 0) + (buckets.GOSPEL.length ? 1000 : 0);
    return { buckets, headingReferences, score: contentScore + requiredBonus };
  }

  private hasReadingEvidence(lines: string[], startIndex: number): boolean {
    // O menu da Canção Nova também contém "1ª Leitura / Salmo / Evangelho".
    // A evidência precisa existir dentro do próprio bloco FIRST, antes de qualquer
    // outro cabeçalho. Assim o sumário nunca é escolhido como conteúdo real.
    const block: string[] = [];
    for (let index = startIndex + 1; index < Math.min(lines.length, startIndex + 12); index += 1) {
      const heading = this.classifyHeading(lines[index]);
      if (heading) break;
      block.push(lines[index]);
    }
    return /(?:Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)\b/i.test(block.join(' '));
  }

  private hasRequiredSections(candidate: Candidate): boolean {
    return candidate.buckets.FIRST.join(' ').length >= 40
      && `${candidate.buckets.PSALM.join(' ')}`.length >= 20
      && candidate.buckets.GOSPEL.join(' ').length >= 40;
  }

  private chooseCandidate(lines: string[]): Candidate {
    const starts = lines
      .map((line, index) => ({ index, heading: this.classifyHeading(line) }))
      .filter((item) => item.heading?.section === 'FIRST')
      .map((item) => item.index);

    // Menus de navegação também costumam conter "1ª Leitura / Salmo / Evangelho".
    // Priorizamos o marcador que é seguido pela fórmula litúrgica real, evitando
    // interpretar os links do topo como se fossem o conteúdo das leituras.
    const evidencedStarts = starts.filter((index) => this.hasReadingEvidence(lines, index));
    const candidates = (evidencedStarts.length ? evidencedStarts : starts)
      .map((index) => this.candidateFrom(lines, index))
      // Um bloco de menu costuma produzir somente 0 a 3 caracteres depois da
      // remoção da referência. Ele nunca deve competir com a leitura real.
      .filter((candidate) => candidate.buckets.FIRST.join(' ').trim().length >= 20)
      // O bloco real deve conter a fórmula introdutória da leitura. Esse critério
      // tem precedência sobre o tamanho total, pois menus podem acumular vários
      // rótulos e ganhar uma pontuação artificial.
      .sort((a, b) => {
        const aEvidence = /(?:Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)\b/i.test(a.buckets.FIRST.join(' ')) ? 1 : 0;
        const bEvidence = /(?:Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)\b/i.test(b.buckets.FIRST.join(' ')) ? 1 : 0;
        return bEvidence - aEvidence || b.score - a.score;
      });
    const complete = candidates.find((candidate) => this.hasRequiredSections(candidate));
    if (complete) return complete;
    if (candidates[0]) return candidates[0];

    // Segunda tentativa: procura diretamente a fórmula litúrgica real e cria um
    // cabeçalho sintético imediatamente antes dela. Isso contorna menus, links e
    // cabeçalhos duplicados sem depender da estrutura HTML do provedor.
    const formulaStart = lines.findIndex((line, index) => {
      if (!/^(Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)\b/i.test(line)) return false;
      const nextSection = lines.slice(index + 1).findIndex((candidateLine) => {
        const candidateHeading = this.classifyHeading(candidateLine);
        return candidateHeading?.section === 'PSALM' || candidateHeading?.section === 'GOSPEL';
      });
      return nextSection >= 0;
    });
    if (formulaStart >= 0) {
      const synthetic = [...lines];
      synthetic.splice(formulaStart, 0, 'Primeira Leitura');
      const direct = this.candidateFrom(synthetic, formulaStart);
      if (direct.buckets.FIRST.join(' ').trim().length >= 20) return direct;
    }

    // Fallback para páginas que omitem o rótulo "Primeira Leitura", mas
    // mantêm a fórmula litúrgica "Leitura do/da..." antes do Salmo.
    const inferredStart = lines.findIndex((line) => /^(Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)\b/i.test(line));
    if (inferredStart >= 0) {
      const synthetic = [...lines];
      synthetic.splice(inferredStart, 0, 'Primeira Leitura');
      return this.candidateFrom(synthetic, inferredStart);
    }
    throw new ServiceUnavailableException('Marcador de Primeira Leitura não encontrado no HTML recebido.');
  }

  private referenceFrom(value: string): string {
    const normalized = value.replace(/[–—]/g, '-').replace(/\s+/g, ' ');
    const patterns = [
      /\bSl\s*\d+(?:\(\d+\))?(?:[,.:]\s*\d+)?(?:[-.]\d+)*(?:\s*\(R\.?\s*[^)]+\))?/i,
      /\b(?:[1-3]\s*)?[A-ZÁÉÍÓÚ][a-záéíóúç]{0,14}\s+\d+[a-z]?(?:[,.:]\s*\d+)?(?:[-.]\d+)*(?:\s*\([^)]+\))?/,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(normalized);
      if (match) return match[0].replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  private isDuplicateLabel(line: string): boolean {
    return /^(primeira leitura|segunda leitura|salmo(?: responsorial)?|responsório|aclamação(?: ao evangelho)?|evangelho)(\s*\([^)]*\))?\s*[:.-]?$/i.test(line.trim());
  }

  private uniqueConsecutive(lines: string[]): string[] {
    return lines.filter((line, index) => index === 0 || line !== lines[index - 1]);
  }

  private cleanLines(lines: string[]): string[] {
    return this.uniqueConsecutive(lines)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !this.isDuplicateLabel(line))
      .filter((line) => !/^(ouça|imprimir|compartilhar|download|áudio)$/i.test(line));
  }

  private parseReading(linesInput: string[], headingReference = '', gospel = false): { reference: string; title: string; text: string } {
    let lines = this.cleanLines(linesInput);
    const joinedBeginning = lines.slice(0, 5).join(' ');
    const reference = headingReference || this.referenceFrom(joinedBeginning);

    if (reference) {
      lines = lines
        .map((line, index) => index < 5 ? line.replace(reference, '').replace(/^\(\s*\)$/, '').trim() : line)
        .filter(Boolean);
    }

    lines = lines.filter((line) => !(/^[-–—]?$/.test(line)));
    const titlePattern = gospel
      ? /^(Proclamação do Evangelho|Início do Evangelho|Conclusão do santo Evangelho)\b/i
      : /^(Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)\b/i;
    const titleIndex = lines.findIndex((line) => titlePattern.test(line) && line.length < 420);
    let title = '';
    if (titleIndex >= 0) {
      const current = lines[titleIndex];
      // Em alguns layouts, a fórmula introdutória e o primeiro versículo vêm
      // no mesmo nó HTML. Conservamos o conteúdo após a primeira frase.
      const inlineTitle = gospel
        ? /^((?:Proclamação do Evangelho|Início do Evangelho|Conclusão do santo Evangelho)[^.]*\.)\s*(.*)$/i.exec(current)
        : /^((?:Leitura (?:da|do|dos|de)|Leitura da Carta|Leitura do Livro|Leitura da Profecia)[^.]*\.)\s*(.*)$/i.exec(current);
      if (inlineTitle) {
        title = inlineTitle[1].trim();
        if (inlineTitle[2].trim()) lines[titleIndex] = inlineTitle[2].trim();
        else lines.splice(titleIndex, 1);
      } else {
        title = current;
        lines.splice(titleIndex, 1);
      }
    }

    const terminal = gospel
      ? /(?:^|(?<=[.!?])\s+)[-–—]?\s*Palavra da Salvação\b/i
      : /(?:^|(?<=[.!?])\s+)[-–—]?\s*Palavra do Senhor\b/i;
    const body: string[] = [];
    for (const line of lines) {
      const terminalMatch = terminal.exec(line);
      if (terminalMatch) {
        const before = line.slice(0, terminalMatch.index).trim();
        if (before) body.push(before);
        break;
      }
      if (/^(Graças a Deus|Glória a vós, Senhor)\.?$/i.test(line)) break;
      body.push(line);
    }

    return { reference, title, text: this.uniqueConsecutive(body).join('\n').trim() };
  }

  private normalizePsalmReference(reference: string): string {
    return reference
      .replace(/^Sl\s*(\d+(?:\(\d+\))?)\s*,?\s*/i, 'Sl $1,')
      .replace(/,,+/g, ',')
      .replace(/,\s*$/, '')
      .trim();
  }

  private parsePsalm(linesInput: string[], headingReference = ''): { reference: string; response: string; text: string } {
    let lines = this.cleanLines(linesInput);
    let reference = headingReference || this.referenceFrom(lines.slice(0, 5).join(' '));

    if (reference) {
      const referenceParts: string[] = [];
      lines = lines.map((line, index) => {
        if (index > 4) return line;
        if (line.includes(reference)) return line.replace(reference, '').trim();
        if (index <= 2 && /^[,.;\d\s()Rra-]+$/.test(line)) {
          referenceParts.push(line);
          return '';
        }
        return line;
      }).filter(Boolean);
      if (referenceParts.length) reference = `${reference}${referenceParts.join('')}`;
    }
    reference = this.normalizePsalmReference(reference);

    let response = '';
    let responseIndex = lines.findIndex((line) => /^(R\.?|Resp\.?|Responsório)\s*[:.—–-]?\s*\S+/i.test(line));
    if (responseIndex >= 0) {
      response = lines[responseIndex].replace(/^(R\.?|Resp\.?|Responsório)\s*[:.—–-]?\s*/i, '').trim();
    } else {
      const counts = new Map<string, { line: string; count: number; first: number }>();
      lines.forEach((line, index) => {
        if (line.length < 8 || line.length > 180) return;
        const key = this.normalizeForMatch(line).replace(/^[-–—]\s*/, '');
        const current = counts.get(key);
        counts.set(key, current ? { ...current, count: current.count + 1 } : { line, count: 1, first: index });
      });
      const repeated = [...counts.values()].filter((item) => item.count >= 2).sort((a, b) => a.first - b.first)[0];
      if (repeated) {
        response = repeated.line.replace(/^[-–—]\s*/, '').trim();
        responseIndex = repeated.first;
      } else if (lines[0] && lines[0].length <= 180 && !/^\d+\b/.test(lines[0])) {
        response = lines[0].replace(/^[-–—]\s*/, '').trim();
        responseIndex = 0;
      }
    }

    const normalizeResponseLine = (value: string) => this.normalizeForMatch(value)
      .replace(/^(r\.?|resp\.?|responsorio)\s*[:.—–-]?\s*/, '')
      .replace(/^[-–—]\s*/, '');
    const responseKey = normalizeResponseLine(response);
    const stanzas = lines.filter((line, index) => {
      if (index === responseIndex) return false;
      return !response || normalizeResponseLine(line) !== responseKey;
    });
    return { reference, response, text: stanzas.join('\n').trim() };
  }

  private parseAcclamation(linesInput: string[], headingReference = ''): { reference: string; text: string } {
    let lines = this.cleanLines(linesInput);
    const reference = headingReference || this.referenceFrom(lines.slice(0, 3).join(' '));
    if (reference) lines = lines.map((line, index) => index < 3 ? line.replace(reference, '').trim() : line).filter(Boolean);
    return { reference, text: lines.join('\n').trim() };
  }

  parse(html: string, date: string, source: LectioSource): ParsedLectio {
    const lines = this.normalizeHtmlToLines(html);
    if (lines.join(' ').length < 250) {
      throw new ServiceUnavailableException(`${source} não retornou conteúdo litúrgico suficiente.`);
    }

    const candidate = this.chooseCandidate(lines);
    const first = this.parseReading(candidate.buckets.FIRST, candidate.headingReferences.FIRST);
    const psalm = this.parsePsalm(candidate.buckets.PSALM, candidate.headingReferences.PSALM);
    const second = candidate.buckets.SECOND.length
      ? this.parseReading(candidate.buckets.SECOND, candidate.headingReferences.SECOND)
      : { reference: '', title: '', text: '' };
    const acclamation = this.parseAcclamation(candidate.buckets.ACCLAMATION, candidate.headingReferences.ACCLAMATION);
    const gospel = this.parseReading(candidate.buckets.GOSPEL, candidate.headingReferences.GOSPEL, true);

    const psalmContentLength = `${psalm.response} ${psalm.text}`.trim().length;
    if (first.text.length < 40 || psalmContentLength < 20 || gospel.text.length < 40) {
      throw new ServiceUnavailableException(
        `Estrutura litúrgica inválida em ${source}: conteúdo insuficiente `
        + `(primeira=${first.text.length}, salmo=${psalmContentLength}, evangelho=${gospel.text.length}).`,
      );
    }

    const allText = lines.join('\n');
    const celebration = lines.find((line) => /(?:Semana|Domingo|Festa|Solenidade|Memória).*(?:Tempo|Senhor|Virgem|Santo|Santa)?/i.test(line) && line.length <= 150) ?? '';
    const liturgicalTime = allText.match(/(?:Tempo litúrgico|Tempo Litúrgico)\s*[:-]?\s*([^\n]+)/i)?.[1]?.trim()
      || celebration.match(/Tempo\s+[A-Za-zÀ-ÿ]+/i)?.[0]
      || '';
    const liturgicalColor = allText.match(/\b(Verde|Branco|Branca|Vermelho|Vermelha|Roxo|Roxa|Rosa)\b/i)?.[1] || '';

    return {
      date,
      title: celebration || `Liturgia de ${date}`,
      celebration,
      liturgicalTime,
      liturgicalColor,
      firstReadingReference: first.reference,
      firstReadingTitle: first.title,
      firstReadingText: first.text,
      psalmReference: psalm.reference,
      psalmResponse: psalm.response,
      psalmText: psalm.text,
      secondReadingReference: second.reference,
      secondReadingTitle: second.title,
      secondReadingText: second.text,
      acclamationReference: acclamation.reference,
      acclamationText: acclamation.text,
      gospelReference: gospel.reference,
      gospelTitle: gospel.title,
      gospelText: gospel.text,
      entranceAntiphon: '',
      communionAntiphon: '',
      source,
    };
  }
}
