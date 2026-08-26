import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaMissionariaPage } from './AgendaMissionariaPage';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), canCreate: false }));
vi.mock('../services/api', () => ({ api: { get: mocks.get, post: mocks.post, patch: mocks.patch }, apiErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Erro' }));
vi.mock('../rbac/usePermission', () => ({ usePermission: () => ({ hasPermission: () => mocks.canCreate }) }));

const mission = {
  id: 'mission-a', title: 'Missão local', description: 'Teste', type: 'MISSAO', status: 'ENVIADA_AOS_MEMBROS',
  startDate: '2026-09-05', endDate: '2026-09-05', startTime: '16:00', endTime: '18:00', location: 'Local',
  city: 'Brasília', state: 'DF', participantIds: ['sent'], participantNames: ['Enviado'], accompanyingIds: [],
  accompanyingNames: [], intercessorIds: [], intercessorNames: [], canEdit: false, canSubmit: false,
  canReview: false, canSelectMembers: false, canComplete: true, active: true,
};

function configure() {
  mocks.get.mockImplementation(async (url: string) => {
    if (url === '/missionary-agenda') return { data: [mission] };
    if (url === '/missionary-agenda/options') return { data: { currentMemberId: 'sent', members: [], ministries: [] } };
    if (url.endsWith('/history')) return { data: [{ id: 'h', status: 'CONCLUIDA', action: 'CONCLUIDA', createdAt: '2026-09-05T18:00:00Z' }] };
    return { data: {} };
  });
}

describe('AgendaMissionariaPage', () => {
  beforeEach(() => { mocks.get.mockReset(); mocks.post.mockReset(); mocks.patch.mockReset(); mocks.canCreate = false; configure(); });

  it('exibe confirmação, loading, sucesso e histórico para missão autorizada', async () => {
    let release: () => void = () => undefined;
    mocks.post.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ data: { ...mission, status: 'CONCLUIDA' } }); }));
    render(<AgendaMissionariaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Concluir missão' }));
    expect(screen.getByRole('dialog', { name: 'Concluir missão' })).toBeInTheDocument();
    const confirmation = userEvent.click(screen.getByRole('button', { name: 'Confirmar conclusão' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Concluindo/ })).toBeDisabled());
    release();
    await confirmation;
    expect(await screen.findByText('Missão concluída com sucesso.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Concluir missão' })).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(await screen.findByText('CONCLUIDA')).toBeInTheDocument();
  });

  it('não oferece conclusão quando o backend nega canComplete', async () => {
    mocks.get.mockImplementation(async (url: string) => url === '/missionary-agenda'
      ? { data: [{ ...mission, canComplete: false }] }
      : { data: { currentMemberId: 'outsider', members: [], ministries: [] } });
    render(<AgendaMissionariaPage />);
    await screen.findByText('Missão local');
    expect(screen.queryByRole('button', { name: 'Concluir missão' })).not.toBeInTheDocument();
  });

  it('mantém o diálogo e anuncia erro quando a conclusão falha', async () => {
    mocks.post.mockRejectedValue(new Error('Conflito de conclusão'));
    render(<AgendaMissionariaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Concluir missão' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar conclusão' }));
    expect(await screen.findByText('Conflito de conclusão')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Concluir missão' })).toBeInTheDocument();
  });
});
