import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';
import type { FileMetadataDto } from './files.types';

@Injectable()
export class FilesService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  private fromRecord(record: Record<string,string>): FileMetadataDto {
    return {
      id: record.id,
      driveFileId: record.drive_file_id,
      name: record.nome_armazenado || record.nome_original,
      originalName: record.nome_original,
      storedName: record.nome_armazenado,
      mimeType: record.mime_type,
      size: Number(record.tamanho || 0),
      checksum: record.checksum,
      category: (record.modulo || 'GENERIC') as FileMetadataDto['category'],
      referenceId: record.referencia_id,
      folderId: record.pasta_id,
      webViewLink: record.url_visualizacao,
      downloadUrl: record.url_download,
      public: ['true','sim','1'].includes((record.publico || '').toLowerCase()),
      uploadedBy: record.enviado_por,
      createdAt: record.criado_em,
      updatedAt: record.atualizado_em,
      deleted: ['true','sim','1'].includes((record.excluido || '').toLowerCase()),
      deletedAt: record.excluido_em,
    };
  }

  async save(record: FileMetadataDto) {
    const now = new Date().toISOString();
    await this.sheets.appendRecord('Arquivos', {
      id: record.id,
      drive_file_id: record.driveFileId,
      nome_original: record.originalName || record.name,
      nome_armazenado: record.storedName || record.name,
      mime_type: record.mimeType,
      tamanho: record.size,
      checksum: record.checksum || '',
      pasta_id: record.folderId || '',
      modulo: record.category,
      referencia_tipo: record.category,
      referencia_id: record.referenceId,
      url_visualizacao: record.webViewLink,
      url_download: record.downloadUrl || '',
      publico: record.public ?? false,
      enviado_por: record.uploadedBy,
      criado_em: record.createdAt,
      atualizado_em: record.updatedAt || now,
      excluido: record.deleted,
      excluido_em: record.deletedAt || '',
    });
    await this.log(record.id, 'UPLOAD', record.uploadedBy, { category: record.category, referenceId: record.referenceId });
    return record;
  }

  async list() {
    const rows = await this.sheets.read('Arquivos');
    return rows.map((row) => this.fromRecord(row)).filter((row) => !row.deleted);
  }

  async find(id: string) {
    const rows = await this.sheets.read('Arquivos');
    const row = rows.find((item) => item.id === id);
    return row ? this.fromRecord(row) : null;
  }

  async softDelete(id: string, userId = 'system') {
    const item = await this.find(id);
    if (!item) return null;
    const now = new Date().toISOString();
    const rows = await this.sheets.read('Arquivos');
    const source = rows.find((row) => row.id === id);
    if (!source) return null;
    await this.sheets.updateRecord('Arquivos', 'id', id, { ...source, excluido: true, excluido_em: now, atualizado_em: now });
    await this.log(id, 'EXCLUIR', userId, {});
    return { ...item, deleted: true, deletedAt: now, updatedAt: now };
  }

  async log(fileId: string, action: 'UPLOAD'|'VISUALIZAR'|'BAIXAR'|'SUBSTITUIR'|'EXCLUIR'|'RESTAURAR', userId: string, details: unknown) {
    await this.sheets.appendRecord('HistoricoArquivos', {
      id: randomUUID(), arquivo_id: fileId, acao: action, usuario_id: userId,
      detalhes: JSON.stringify(details), ip: '', user_agent: '', criado_em: new Date().toISOString(),
    });
  }
}
