import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function QuickAccessCard({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 1 }}>
          <Box sx={{ color: 'primary.main', '& svg': { fontSize: 39 } }}>{icon}</Box>
          <Typography fontWeight={800}>{title}</Typography>
          <Typography color="text.secondary" fontSize={13}>{subtitle}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
