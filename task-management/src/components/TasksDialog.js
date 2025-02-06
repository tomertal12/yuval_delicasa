import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Button,
  Typography,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Snackbar,
  Alert,
} from '@mui/material';

const defaultTask = {
  title: '',
  details: '',
  status: 'In Progress',
  shouldAddImage: false,
  notifyMethod: 'interval', // 'interval' | 'fixed' | 'none'
  noticeInterval: 1,
  noticeTime: '',
  firstTimeMessageMethod: 'now', // 'now' | 'fixed' | 'none'
  firstTimeMessageTime: '',
  role: 'Management', // default role
};

const TasksDialog = ({
  open,
  onClose,
  duration,
  onTaskCreated,
  availableRoles = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [taskForm, setTaskForm] = useState(defaultTask);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success' | 'error' | 'warning' | 'info'
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Reset form and close snackbar whenever dialog opens
    if (open) {
      setTaskForm({ ...defaultTask });
      setSnackbar({ open: false, message: '', severity: 'info' });
    }
  }, [open]);

  // Generic change handler
  const handleChange = (field, value) => {
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    // Merge the chosen duration
    const newTask = {
      ...taskForm,
      duration, // daily|weekly|monthly from the tab
    };

    try {
      const response = await fetch(`${API_URL}/api/tasks/addTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      const result = await response.json();

      if (response.ok) {
        console.log('Task created:', result);
        // Show success message
        setSnackbar({
          open: true,
          message: 'Task created successfully!',
          severity: 'success',
        });

        // Optionally wait a second before closing
        setTimeout(() => {
          onTaskCreated(); // calls parent to refresh tasks & closes dialog
        }, 1000);

      } else {
        console.error('Error creating task:', result);
        // Show error message
        setSnackbar({
          open: true,
          message: result.error || 'Failed to create task',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Request failed:', err);
      // Show error message
      setSnackbar({
        open: true,
        message: 'An error occurred while creating the task.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Create New {duration.charAt(0).toUpperCase() + duration.slice(1)} Task
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          label="Title"
          variant="outlined"
          fullWidth
          required
          value={taskForm.title}
          onChange={(e) => handleChange('title', e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Details"
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          value={taskForm.details}
          onChange={(e) => handleChange('details', e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* ROLE SELECT */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Role</InputLabel>
          <Select
            label="Role"
            value={taskForm.role}
            onChange={(e) => handleChange('role', e.target.value)}
          >
            {availableRoles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Notification Method */}
        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Notification Method
        </Typography>
        <RadioGroup
          row
          value={taskForm.notifyMethod}
          onChange={(e) => handleChange('notifyMethod', e.target.value)}
        >
          <FormControlLabel value="interval" control={<Radio />} label="Every X Hours" />
          <FormControlLabel value="fixed" control={<Radio />} label="Fixed Time" />
          <FormControlLabel value="none" control={<Radio />} label="No Notification" />
        </RadioGroup>

        {taskForm.notifyMethod === 'interval' && (
          <TextField
            label="Interval (hours)"
            type="number"
            fullWidth
            variant="outlined"
            value={taskForm.noticeInterval}
            onChange={(e) => handleChange('noticeInterval', parseInt(e.target.value) || 1)}
            sx={{ my: 2 }}
          />
        )}

        {taskForm.notifyMethod === 'fixed' && (
          <TextField
            label="Notify at (HH:MM)"
            type="time"
            fullWidth
            variant="outlined"
            value={taskForm.noticeTime}
            onChange={(e) => handleChange('noticeTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ my: 2 }}
          />
        )}

        {/* First-time message */}
        <Typography variant="subtitle2" sx={{ mt: 3 }}>
          First Time Message
        </Typography>
        <RadioGroup
          row
          value={taskForm.firstTimeMessageMethod}
          onChange={(e) => handleChange('firstTimeMessageMethod', e.target.value)}
        >
          <FormControlLabel value="now" control={<Radio />} label="Now" />
          <FormControlLabel value="fixed" control={<Radio />} label="Fixed Time" />
          <FormControlLabel value="none" control={<Radio />} label="No First Message" />
        </RadioGroup>

        {taskForm.firstTimeMessageMethod === 'fixed' && (
          <TextField
            label="First Message Time"
            type="time"
            fullWidth
            variant="outlined"
            value={taskForm.firstTimeMessageTime}
            onChange={(e) => handleChange('firstTimeMessageTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ my: 2 }}
          />
        )}

        {/* Should Add Image */}
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={taskForm.shouldAddImage}
                onChange={(e) => handleChange('shouldAddImage', e.target.checked)}
              />
            }
            label="Should Add Image"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Task'}
        </Button>
      </DialogActions>

      {/* SNACKBAR FOR SUCCESS/ERROR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default TasksDialog;
