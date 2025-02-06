import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#673ab7', // A modern purple
    },
    secondary: {
      main: '#f50057', // Pink accent
    },
  },
  typography: {
    fontFamily: '"Poppins", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none', // Keep normal case for buttons
    },
  },
});

export default theme;
