import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { GoogleSheetsService, type MemberRow } from '../google/google-sheets.service';
import type { AccessProfile, AuthenticatedUser } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly sheets: GoogleSheetsService,
  ) {}

  private firebaseApp() {
    if (getApps().length) return getApps()[0];
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      if (this.config.get('DEMO_MODE') !== 'true') {
        throw new ServiceUnavailableException('Firebase Admin não configurado no backend.');
      }
      return initializeApp({ credential: applicationDefault() });
    }

    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  private normalizeProfile(value: string): AccessProfile {
    const normalized = value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['DEVELOPER', 'DESENVOLVEDOR'].includes(normalized)) return 'DEVELOPER';
    if (normalized === 'ADMIN') return 'ADMIN';
    if (['LIDER_MINISTERIO', 'LIDER DE MINISTERIO', 'MINISTRY_LEADER'].includes(normalized)) return 'MINISTRY_LEADER';
    if (['LIDER', 'LEADER', 'LIDER_CELULA', 'LIDER DE CELULA', 'CELL_LEADER'].includes(normalized)) return 'CELL_LEADER';
    return 'MEMBER';
  }

  private toUser(uid: string, member: MemberRow): AuthenticatedUser {
    return {
      ...member,
      uid,
      memberId: member.id,
      profile: this.normalizeProfile(member.profile),
      active: true,
    };
  }

  async authenticateToken(idToken: string): Promise<AuthenticatedUser> {
    if (this.config.get('DEMO_MODE') === 'true' && idToken === 'demo-token') {
      const member = await this.sheets.findActiveMemberByEmail('talisson@example.com');
      if (!member) throw new UnauthorizedException('Usuário demonstrativo não encontrado.');
      return this.toUser('demo-user', member);
    }

    let decoded: DecodedIdToken;
    try {
      decoded = await getAuth(this.firebaseApp()).verifyIdToken(idToken, true);
    } catch {
      throw new UnauthorizedException('Sessão Google inválida, expirada ou revogada.');
    }

    if (!decoded.email || decoded.email_verified === false) {
      throw new UnauthorizedException('A conta Google precisa possuir um e-mail verificado.');
    }

    const member = await this.sheets.findActiveMemberByEmail(decoded.email);
    if (!member) {
      throw new ForbiddenException('Seu e-mail não está ativo na aba Membros do Google Sheets.');
    }

    const user = this.toUser(decoded.uid, member);
    user.name = member.name || decoded.name || decoded.email;
    user.photo = member.photo || decoded.picture || '';
    return user;
  }

  async login(idToken: string) {
    return { user: await this.authenticateToken(idToken) };
  }
}
