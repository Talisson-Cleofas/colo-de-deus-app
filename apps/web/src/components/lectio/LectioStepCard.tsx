import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function LectioStepCard({ number, title, subtitle, children }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: 'primary.contrastText',
              bgcolor: 'primary.main',
              fontWeight: 800,
            }}
          >
            {number}
          </Box>
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography color="primary.main" fontSize={13} fontWeight={700}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Typography color="text.secondary" lineHeight={1.8} mt={2}>
          {children}
        </Typography>
      </CardContent>
    </Card>
  );
}
