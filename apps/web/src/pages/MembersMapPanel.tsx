import { LocationOnOutlined, PersonPinCircleOutlined } from '@mui/icons-material';
import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { Member } from '../types';

const positions: Record<string, { top: string; left: string }> = {
  Brasília: { top: '45%', left: '54%' },
  Taguatinga: { top: '55%', left: '32%' },
  'Águas Claras': { top: '61%', left: '43%' },
  Guará: { top: '48%', left: '43%' },
  Sobradinho: { top: '23%', left: '59%' },
  Ceilândia: { top: '58%', left: '22%' },
};

export function MembersMapPanel({ members }: { members: Member[] }) {
  const grouped = members.reduce<Record<string, Member[]>>((acc, member) => {
    const city = member.city || 'Brasília';
    acc[city] = [...(acc[city] ?? []), member];
    return acc;
  }, {});

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr .8fr' }, gap: 2 }}>
      <Card sx={{ minHeight: 560, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 52% 48%,#3b2a1c 0,#171717 22%,#090909 62%)' }} />
        <Box sx={{ position: 'absolute', inset: 28, border: '1px solid', borderColor: 'divider', borderRadius: 4, opacity: 0.8 }} />
        <Typography sx={{ position: 'absolute', top: 24, left: 28, zIndex: 2 }} variant="h6">Mapa aproximado dos membros</Typography>
        <Typography sx={{ position: 'absolute', top: 57, left: 28, zIndex: 2 }} color="text.secondary" fontSize={13}>Localizações por cidade/região, sem endereço residencial.</Typography>
        {Object.entries(grouped).map(([city, people], index) => {
          const p = positions[city] ?? { top: `${28 + index * 9}%`, left: `${30 + (index % 3) * 18}%` };
          return (
            <Box key={city} sx={{ position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%,-50%)', zIndex: 3, textAlign: 'center' }}>
              <Box sx={{ width: 48, height: 48, mx: 'auto', borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 8px rgba(155,107,62,.18)' }}><PersonPinCircleOutlined /></Box>
              <Chip label={`${city} · ${people.length}`} size="small" sx={{ mt: 1, bgcolor: '#111' }} />
            </Box>
          );
        })}
      </Card>
      <Stack spacing={1.5} sx={{ maxHeight: 560, overflowY: 'auto' }}>
        {Object.entries(grouped).map(([city, people]) => (
          <Card key={city}><CardContent>
            <Stack direction="row" alignItems="center" spacing={1}><LocationOnOutlined color="primary" /><Typography variant="h6">{city}</Typography></Stack>
            <Typography color="text.secondary" fontSize={13} mb={1.5}>{people.length} membro(s)</Typography>
            <Stack spacing={1}>{people.map((m) => <Stack key={m.id} direction="row" spacing={1} alignItems="center"><Avatar src={m.photo} sx={{ width: 34, height: 34 }}>{m.name[0]}</Avatar><Box><Typography fontSize={14} fontWeight={700}>{m.name}</Typography><Typography color="text.secondary" fontSize={12}>{m.cell}</Typography></Box></Stack>)}</Stack>
          </CardContent></Card>
        ))}
      </Stack>
    </Box>
  );
}
