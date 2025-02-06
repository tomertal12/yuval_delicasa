import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';

const SettingsPage = () => {
  return (
    <Box sx={{ bgcolor: '#fafafa', py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Settings
          </Typography>
          <Typography variant="body1">
            Configure your application here...
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default SettingsPage;
