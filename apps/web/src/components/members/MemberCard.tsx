import {
  EmailOutlined,
  LocationOnOutlined,
  PhoneOutlined,
} from '@mui/icons-material';
import { Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Member } from '../../types';
import { MemberAvatar } from './MemberAvatar';

export function MemberCard({ member }: { member: Member }) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        p: 2.25,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: '0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: 'primary.dark',
          boxShadow: '0 14px 35px rgba(0,0,0,0.35)',
        },
      }}
    >
      <Stack direction="row" spacing={1.7} alignItems="center">
        <MemberAvatar name={member.name} photo={member.photo} />
        <Box minWidth={0}>
          <Typography fontWeight={800} fontSize={17} noWrap>
            {member.name}
          </Typography>
          <Typography color="primary.main" fontSize={13} fontWeight={700}>
            {member.role}
          </Typography>
          <Typography color="text.secondary" fontSize={13} noWrap>
            {member.ministry || 'Sem ministério'}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={0.8} mt={2} flex={1}>
        <Typography color="text.secondary" fontSize={13} display="flex" gap={1} alignItems="center">
          <LocationOnOutlined fontSize="small" />
          {member.cell || 'Sem célula'}
        </Typography>
        <Typography color="text.secondary" fontSize={13} display="flex" gap={1} alignItems="center">
          <PhoneOutlined fontSize="small" />
          {member.phone || 'Não informado'}
        </Typography>
        <Typography color="text.secondary" fontSize={13} display="flex" gap={1} alignItems="center" noWrap>
          <EmailOutlined fontSize="small" />
          {member.email}
        </Typography>
      </Stack>

      <Stack direction="row" gap={0.7} mt={1.5} flexWrap="wrap">
        {(member.gifts ?? []).slice(0, 2).map((gift) => (
          <Chip key={gift} label={gift} size="small" variant="outlined" />
        ))}
      </Stack>

      <Button onClick={() => navigate(`/membros/${member.id}`)} fullWidth variant="outlined" sx={{ mt: 2 }}>
        Ver perfil
      </Button>
    </Card>
  );
}
