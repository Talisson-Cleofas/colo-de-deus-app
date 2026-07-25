import { AccessTimeOutlined, LocationOnOutlined } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { MissionEvent } from '../../types';
import { formatDateSafe } from '../../utils/date';


export function EventCard({ event }: { event: MissionEvent }) {
  const navigate = useNavigate();
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          height: 8,
          background: event.featured
            ? 'linear-gradient(90deg, #9b6b3e, #d7ae78)'
            : 'linear-gradient(90deg, #34271e, #17120f)',
        }}
      />
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
          <Chip label={event.category || 'Evento'} color={event.featured ? 'primary' : 'default'} size="small" />
          {event.featured && <Chip label="Destaque" variant="outlined" size="small" />}
        </Stack>
        <Typography variant="h6" mt={2}>
          {event.title}
        </Typography>
        <Typography color="text.secondary" fontSize={14} mt={1} lineHeight={1.6} flex={1}>
          {event.description}
        </Typography>
        <Stack spacing={1} mt={2} color="text.secondary">
          <Typography fontSize={13} display="flex" gap={1} alignItems="center">
            <AccessTimeOutlined fontSize="small" />
            {formatDateSafe(event.startDate, { day: '2-digit', month: 'short', year: 'numeric' })} • {event.startTime || 'Horário a definir'}{event.endTime ? `–${event.endTime}` : ''}
          </Typography>
          <Typography fontSize={13} display="flex" gap={1} alignItems="center">
            <LocationOnOutlined fontSize="small" />
            {event.location}
          </Typography>
        </Stack>
        <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => navigate(`/eventos/${event.id}`)}>
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}
