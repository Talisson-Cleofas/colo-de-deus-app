import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#d39a57', dark: '#9b6b3e', contrastText: '#090909' },
    secondary: { main: '#a75db4' },
    background: { default: '#070707', paper: '#111111' },
    text: { primary: '#f5f3ef', secondary: '#aaa39c' },
    divider: '#2b2825',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h4: { fontWeight: 900 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { minHeight: '100vh', background: 'radial-gradient(circle at 70% 0%, #17100a 0%, #070707 34%)' },
        '*': { scrollbarColor: '#4e3522 #111111' },
      },
    },
    MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiCard: { styleOverrides: { root: { backgroundImage: 'linear-gradient(145deg, rgba(23,23,23,.98), rgba(10,10,10,.98))', border: '1px solid #302b27', boxShadow: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'linear-gradient(145deg, rgba(20,20,20,.98), rgba(9,9,9,.98))' } } },
  },
});
