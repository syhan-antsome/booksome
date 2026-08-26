import { createTheme } from '@mui/material/styles';

export const booksomeTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#174b37', dark: '#0e3526', light: '#47735f' },
    secondary: { main: '#c7830e', dark: '#956008' },
    background: { default: '#f7f5ef', paper: '#fffefb' },
    text: { primary: '#20241f', secondary: '#667067' },
    divider: '#e4e1d9',
    success: { main: '#3d7b4b' },
    warning: { main: '#c7830e' },
    error: { main: '#b44940' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'Pretendard, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: '2rem', fontWeight: 750, letterSpacing: '-0.035em' },
    h2: { fontSize: '1.4rem', fontWeight: 720, letterSpacing: '-0.025em' },
    h3: { fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.015em' },
    button: { fontWeight: 650, letterSpacing: '-0.01em', textTransform: 'none' },
    body1: { letterSpacing: '-0.012em' },
    body2: { letterSpacing: '-0.01em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#f7f5ef' },
        '*::selection': { background: '#dbe8df' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#e4e1d9' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #e4e1d9', boxShadow: '0 1px 2px rgba(27, 42, 33, 0.03)' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 7 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { color: '#5e665f', fontSize: '0.77rem', fontWeight: 700, backgroundColor: '#fbfaf6' },
        root: { borderBottomColor: '#ebe8e1' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { background: '#123c2b', color: '#eef4ef', borderRight: 0 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { background: 'rgba(247, 245, 239, 0.94)', color: '#20241f', boxShadow: 'none', borderBottom: '1px solid #e4e1d9' },
      },
    },
    RaLayout: {
      styleOverrides: {
        root: { '& .RaLayout-content': { padding: '24px 28px 36px' } },
      },
    },
    RaSidebar: {
      styleOverrides: {
        root: {
          width: 232,
          '& .RaSidebar-drawerPaper': { width: 232 },
        },
      },
    },
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          color: '#dce7df',
          borderRadius: 8,
          margin: '3px 12px',
          padding: '10px 12px',
          '& .MuiListItemIcon-root': { color: '#b8cabd', minWidth: 38 },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' },
          '&.RaMenuItemLink-active': {
            backgroundColor: 'rgba(224, 164, 48, 0.14)',
            color: '#f1ba4d',
            '& .MuiListItemIcon-root': { color: '#e4a528' },
          },
        },
      },
    },
  },
});
