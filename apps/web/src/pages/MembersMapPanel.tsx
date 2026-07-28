import {
  LocationOnOutlined,
  MyLocationOutlined,
  PersonPinCircleOutlined,
  RefreshOutlined,
  SearchOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Link,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { MapView } from '../components/maps/MapView';
import type { MapMarkerData } from '../components/maps/types';
import { api, apiErrorMessage } from '../services/api';
import type { Member } from '../types';

type MembersMapResponse = { status: string; members: MapMarkerData[] } | MapMarkerData[];
type Filters = { ministry: string; cell: string; city: string; state: string };
const emptyFilters: Filters = { ministry: '', cell: '', city: '', state: '' };

const text = (value: unknown) => String(value ?? '').trim();
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6371;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const first = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(first), Math.sqrt(1 - first));
}

export function MembersMapPanel({ members }: { members: Member[] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  const query = useQuery({
    queryKey: ['members-map'],
    queryFn: async () => {
      const { data } = await api.get<MembersMapResponse>('/members/map');
      const list = Array.isArray(data) ? data : data.members;
      const deduplicated = [...new Map((Array.isArray(list) ? list : []).filter((item) => item.id).map((item) => [item.id, item])).values()];
      localStorage.setItem('members-map-cache-v1', JSON.stringify(deduplicated));
      return deduplicated;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: 1,
    placeholderData: () => {
      try { return JSON.parse(localStorage.getItem('members-map-cache-v1') || '[]') as MapMarkerData[]; } catch { return []; }
    },
  });

  useEffect(() => {
    const online = () => { void queryClient.invalidateQueries({ queryKey: ['members-map'] }); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [queryClient]);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const data = query.data ?? [];
  const options = useMemo(() => ({
    ministries: unique(data.map((item) => text(item.ministry || memberById.get(item.id)?.ministry))),
    cells: unique(data.map((item) => text(item.cell || memberById.get(item.id)?.cell))),
    cities: unique(data.map((item) => text(item.city))),
    states: unique(data.map((item) => text(item.state))),
  }), [data, memberById]);

  const visible = useMemo(() => {
    const needle = search.toLocaleLowerCase('pt-BR').trim();
    return data
      .map((item) => {
        const member = memberById.get(item.id);
        const normalized: MapMarkerData = {
          ...item,
          title: item.title || item.name || member?.name || 'Membro',
          photo: item.photo || member?.photo || '',
          ministry: item.ministry || member?.ministry || '',
          cell: item.cell || member?.cell || '',
          phone: item.phone || member?.phone || '',
          googleMapsUrl: item.googleMapsUrl || item.navigationUrl || null,
        };
        return userLocation && typeof normalized.latitude === 'number' && typeof normalized.longitude === 'number'
          ? { ...normalized, distanceKm: distanceKm(userLocation, { latitude: normalized.latitude, longitude: normalized.longitude }) }
          : normalized;
      })
      .filter((item) => {
        const searchable = [item.title, item.city, item.state, item.ministry, item.cell, item.formattedAddress, item.address].join(' ').toLocaleLowerCase('pt-BR');
        return (!needle || searchable.includes(needle))
          && (!filters.ministry || item.ministry === filters.ministry)
          && (!filters.cell || item.cell === filters.cell)
          && (!filters.city || item.city === filters.city)
          && (!filters.state || item.state === filters.state);
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [data, memberById, search, filters, userLocation]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['members-map'] });
    await query.refetch();
  };
  const locate = () => {
    setLocationError('');
    if (!navigator.geolocation) return setLocationError('Este dispositivo não oferece geolocalização.');
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocationError('Não foi possível obter sua localização. Verifique a permissão do navegador.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return <Stack spacing={2.5}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={1}>
      <Box>
        <Typography variant="h5">Localização dos membros</Typography>
        <Typography color="text.secondary">Mapa geocodificado, sem duplicações, com pesquisa, filtros e rotas válidas.</Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button startIcon={<MyLocationOutlined />} variant="outlined" onClick={locate}>Minha localização</Button>
        <Button startIcon={<RefreshOutlined />} onClick={() => void refresh()} disabled={query.isFetching}>Atualizar mapa</Button>
      </Stack>
    </Stack>

    {(query.error || locationError) && <Alert severity="warning">{locationError || apiErrorMessage(query.error)}</Alert>}

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr repeat(4, minmax(150px, 1fr))' }, gap: 1.5 }}>
      <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar membro, cidade, ministério ou célula" InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }} />
      <TextField select label="Ministério" value={filters.ministry} onChange={(event) => setFilters((current) => ({ ...current, ministry: event.target.value }))}><MenuItem value="">Todos</MenuItem>{options.ministries.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      <TextField select label="Célula" value={filters.cell} onChange={(event) => setFilters((current) => ({ ...current, cell: event.target.value }))}><MenuItem value="">Todas</MenuItem>{options.cells.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      <TextField select label="Cidade" value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}><MenuItem value="">Todas</MenuItem>{options.cities.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      <TextField select label="Estado" value={filters.state} onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}><MenuItem value="">Todos</MenuItem>{options.states.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
    </Box>

    {query.isLoading ? <Skeleton variant="rounded" height={440} /> : <MapView markers={visible} height={440} userLocation={userLocation} />}

    {!query.isLoading && visible.length === 0 && <Alert severity="info">Nenhum membro corresponde aos filtros ou possui dados de endereço disponíveis.</Alert>}

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 2 }}>
      {query.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rounded" height={130} />) : visible.map((marker) => {
        const address = marker.formattedAddress || marker.address || [marker.city, marker.state].filter(Boolean).join(', ');
        return <Card key={marker.id} variant="outlined"><CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={marker.photo || undefined}>{marker.title.slice(0, 1)}</Avatar>
            <Box flex={1} minWidth={0}>
              <Typography fontWeight={800}>{marker.title}</Typography>
              <Typography variant="body2" color="text.secondary">{address || 'Endereço não cadastrado'}</Typography>
              <Typography variant="caption" color="text.secondary">{[marker.ministry && `Ministério: ${marker.ministry}`, marker.cell && `Célula: ${marker.cell}`, marker.distanceKm !== undefined && `${marker.distanceKm.toFixed(1)} km de você`].filter(Boolean).join(' • ')}</Typography>
            </Box>
            <PersonPinCircleOutlined color={marker.latitude !== null && marker.longitude !== null ? 'primary' : 'disabled'} />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
            <LocationOnOutlined fontSize="small" color="primary" />
            {marker.googleMapsUrl ? <Link href={marker.googleMapsUrl} target="_blank" rel="noreferrer">Abrir rota no Google Maps</Link> : <Typography variant="body2" color="text.secondary">Endereço não cadastrado</Typography>}
          </Stack>
        </CardContent></Card>;
      })}
    </Box>
  </Stack>;
}
