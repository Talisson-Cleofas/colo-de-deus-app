import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { PermissionRoute } from './PermissionRoute';

const state = vi.hoisted(() => ({ user: null as null | { profile: string }, allowed: false, loading: false, error: '' }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('./usePermission', () => ({ usePermission: () => ({
  loading: state.loading, error: state.error, hasPermission: () => state.allowed,
  hasAnyPermission: () => state.allowed, refreshPermissions: vi.fn(),
}) }));

function routes(element: ReactNode) {
  return render(<MemoryRouter initialEntries={['/restrita']}><Routes>
    <Route path="/restrita" element={element} />
    <Route path="/login" element={<div>Login</div>} />
    <Route path="/sem-permissao" element={<div>Bloqueado</div>} />
  </Routes></MemoryRouter>);
}

describe('proteção de navegação e RBAC', () => {
  beforeEach(() => { state.user = null; state.allowed = false; state.loading = false; state.error = ''; });

  it('redireciona usuário não autenticado para login', () => {
    routes(<ProtectedRoute><div>Privado</div></ProtectedRoute>);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Privado')).not.toBeInTheDocument();
  });

  it('renderiza rota autenticada e bloqueia permissão ausente', () => {
    state.user = { profile: 'MEMBER' };
    routes(<ProtectedRoute><PermissionRoute permission={'SETTINGS:READ'}><div>Administração</div></PermissionRoute></ProtectedRoute>);
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
  });

  it('renderiza conteúdo quando backend concede a permissão', () => {
    state.user = { profile: 'ADMIN' };
    state.allowed = true;
    routes(<ProtectedRoute><PermissionRoute permission={'SETTINGS:READ'}><div>Administração</div></PermissionRoute></ProtectedRoute>);
    expect(screen.getByText('Administração')).toBeInTheDocument();
  });
});
