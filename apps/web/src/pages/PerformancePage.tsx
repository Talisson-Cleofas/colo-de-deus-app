import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../services/api';

type RouteMetric = {
  count: number;
  averageMs: number;
  maxMs: number;
  lastMs: number;
};

type Metrics = {
  uptimeSeconds: number;
  cache: {
    entries: number;
    inFlight: number;
    hits: number;
    misses: number;
    staleHits: number;
    deduplicated: number;
    hitRate: number;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
  requests: Record<string, RouteMetric>;
  generatedAt: string;
};

type MetricCard = {
  label: string;
  value: string | number;
};

export function PerformancePage() {
  const query = useQuery({
    queryKey: ['performance', 'metrics'],
    queryFn: async () =>
      (await api.get<Metrics>('/performance/metrics')).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  if (query.isPending) {
    return (
      <Box sx={{ display: 'grid', minHeight: 320, placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (query.error) {
    return <Alert severity="error">{apiErrorMessage(query.error)}</Alert>;
  }

  const data = query.data;
  const cards: MetricCard[] = [
    { label: 'Cache HIT', value: `${data.cache.hitRate}%` },
    { label: 'Entradas em cache', value: data.cache.entries },
    { label: 'Consultas deduplicadas', value: data.cache.deduplicated },
    { label: 'Cache expirado reutilizado', value: data.cache.staleHits },
    { label: 'Memória RSS', value: `${data.memory.rssMb} MB` },
    { label: 'Heap utilizado', value: `${data.memory.heapUsedMb} MB` },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Performance
        </Typography>
        <Typography color="text.secondary">
          Métricas atualizadas automaticamente a cada 15 segundos.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {cards.map(({ label, value }) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h4" fontWeight={800}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Tempo das rotas
          </Typography>
          <Stack spacing={1.2}>
            {(Object.entries(data.requests) as Array<[string, RouteMetric]>)
              .sort(([, first], [, second]) => second.averageMs - first.averageMs)
              .map(([name, metric]) => (
                <Box
                  key={name}
                  sx={{
                    alignItems: { xs: 'flex-start', md: 'center' },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 1,
                    justifyContent: 'space-between',
                    pb: 1,
                  }}
                >
                  <Typography>{name}</Typography>
                  <Typography fontWeight={700}>
                    {metric.averageMs} ms médio · {metric.lastMs} ms último ·{' '}
                    {metric.count} chamadas
                  </Typography>
                </Box>
              ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
