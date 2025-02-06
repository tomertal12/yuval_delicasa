import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';

const EmployeesPage = () => {
  return (
    <Box sx={{ bgcolor: '#fafafa', py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Employees
          </Typography>
          <Typography variant="body1">
            {/* Replace with your real Employees UI */}
            This is where you manage employees...
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default EmployeesPage;
    