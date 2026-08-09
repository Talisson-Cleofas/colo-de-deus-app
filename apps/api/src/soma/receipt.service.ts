import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { MercadoPagoPaymentRecord } from './soma.types';

const esc = (value: string) => value.replace(/[()\\]/g, (m) => `\\${m}`);
@Injectable()
export class ReceiptService {
  hash(
    payment: Pick<
      MercadoPagoPaymentRecord,
      'payment_id' | 'member_id' | 'amount' | 'date_approved'
    >,
  ) {
    return createHash('sha256')
      .update(
        `${payment.payment_id}|${payment.member_id}|${payment.amount}|${payment.date_approved}`,
      )
      .digest('hex');
  }
  pdf(payment: MercadoPagoPaymentRecord, validationUrl: string) {
    const lines = [
      'COLO DE DEUS - MISSAO BRASILIA',
      'RECIBO DE CONTRIBUICAO SOMA+',
      `Membro: ${payment.member_name || payment.payer_email}`,
      `Valor: R$ ${payment.amount.toFixed(2).replace('.', ',')}`,
      `Data: ${new Date(payment.date_approved || payment.date_created).toLocaleDateString('pt-BR')}`,
      `Mercado Pago ID: ${payment.payment_id}`,
      `Forma: ${payment.payment_method || payment.payment_type}`,
      payment.card_last_four
        ? `Cartao: ${payment.card_brand || 'Cartao'} final ${payment.card_last_four}`
        : '',
      `Status: ${payment.status}`,
      `Hash: ${payment.receipt_hash}`,
      `Validacao: ${validationUrl}`,
      'Documento gerado automaticamente pelo aplicativo.',
    ].filter(Boolean);
    const content = ['BT', '/F1 15 Tf', '50 790 Td'];
    lines.forEach((line, index) => {
      if (index > 0) content.push('0 -28 Td');
      content.push(`(${esc(line)}) Tj`);
    });
    content.push('ET');
    const stream = content.join('\n');
    const objects = [
      '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
      '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
      '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj',
      '4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
      `5 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${obj}\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i++)
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf);
  }
}
