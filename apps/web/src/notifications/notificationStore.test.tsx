import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useNotifications } from './notificationStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', () => ({ api, apiErrorMessage: () => 'Falha ao sincronizar notificações' }));

const allowed = { id:'notice-a',title:'Aviso A',message:'Mensagem',type:'INFO',audience:'CENACULO',audienceId:'a',origin:'Sistema',referenceType:'',referenceId:'',link:'',senderId:'',senderName:'Sistema',sentAt:null,read:false,readAt:null,active:true,canDelete:false };

function Probe() {
  const store = useNotifications();
  return <div>
    <span>{store.loading ? 'Carregando' : `${store.total} notificações, ${store.unreadCount} não lidas`}</span>
    {store.items.map((item) => <span key={item.id}>{item.title}</span>)}
    <button onClick={() => void store.reload()}>Recarregar</button>
    {store.items[0] && <button onClick={() => void store.toggleRead(store.items[0])}>Marcar como lida</button>}
  </div>;
}

describe('notificationStore', () => {
  it('renderiza somente estado autorizado e atualiza leitura pela resposta do backend', async () => {
    api.get.mockResolvedValue({ data: { notifications:[allowed],items:[allowed],unreadCount:1,readCount:0,total:1,updatedAt:'now' } });
    api.patch.mockResolvedValue({ data: { state:{ notifications:[{...allowed,read:true}],unreadCount:0,readCount:1,total:1,updatedAt:'later' } } });
    render(<Probe />);
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(await screen.findByText('Aviso A')).toBeInTheDocument();
    expect(screen.queryByText('Aviso de outro cenáculo')).not.toBeInTheDocument();
    expect(screen.getByText('1 notificações, 1 não lidas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como lida' }));
    expect(await screen.findByText('1 notificações, 0 não lidas')).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith('/notifications/notice-a/read', { read: true });
  });
});
