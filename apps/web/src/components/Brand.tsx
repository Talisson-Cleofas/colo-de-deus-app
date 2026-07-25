import { Box, Typography } from '@mui/material';

const officialLogo = `${import.meta.env.BASE_URL}brand/logo-oficial-branca.png`;

export function Brand() {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 0.5,
      }}
    >
      <Box
        component="img"
        src={officialLogo}
        alt="Símbolo oficial da Colo de Deus"
        sx={{
          width: 66,
          height: 66,
          flexShrink: 0,
          objectFit: 'contain',
          display: 'block',
        }}
      />

      <Box sx={{ textAlign: 'left', minWidth: 0 }}>
        <Typography
          sx={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: 1.1,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          COLO DE DEUS
        </Typography>

        <Typography
          sx={{
            color: 'rgba(255,255,255,0.64)',
            fontSize: 12,
            letterSpacing: 2.4,
            lineHeight: 1.2,
            mt: 0.6,
            whiteSpace: 'nowrap',
          }}
        >
          MISSÃO BRASÍLIA
        </Typography>
      </Box>
    </Box>
  );
}
