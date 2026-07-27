import { LocationOnOutlined, PersonPinCircleOutlined, RefreshOutlined } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Link, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { MapView } from '../components/maps/MapView';
import type { MapMarkerData } from '../components/maps/types';
import { api, apiErrorMessage } from '../services/api';
import type { Member } from '../types';

export function MembersMapPanel({ members }: { members: Member[] }) {
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<MapMarkerData[]>('/maps/members');
      setMarkers(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
      setMarkers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const memberById = new Map(members.map((member) => [member.id, member]));

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1}>
        <Box>
          <Typography variant="h5">Localização dos membros</Typography>
          <Typography color="text.secondary">
            Endereços cadastrados são convertidos em coordenadas e exibidos com acesso direto ao Google Maps.
          </Typography>
        </Box>
        <Button startIcon={<RefreshOutlined />} onClick={() => void load()} disabled={loading}>Atualizar mapa</Button>
      </Stack>

      {error && <Alert severity="warning">{error}</Alert>}
      {loading ? <Box py={8} textAlign="center"><CircularProgress /></Box> : (
        <>
          <MapView markers={markers} height={420} />
          {markers.length === 0 && (
            <Alert severity="info">
              Nenhum membro possui endereço completo ou coordenadas válidas. Edite o cadastro e informe endereço, bairro, cidade, estado e CEP.
            </Alert>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' }, gap: 2 }}>
            {markers.map((marker) => {
              const member = memberById.get(marker.id);
              return (
                <Card key={marker.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={member?.photo}>{marker.title.slice(0, 1)}</Avatar>
                      <Box flex={1}>
                        <Typography fontWeight={800}>{marker.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{marker.address}</Typography>
                      </Box>
                      <PersonPinCircleOutlined color="primary" />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
                      <LocationOnOutlined fontSize="small" color="primary" />
                      <Link href={marker.navigationUrl} target="_blank" rel="noreferrer">Abrir rota no Google Maps</Link>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </>
      )}
    </Stack>
  );
}
