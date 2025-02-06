import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  Button,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  CircularProgress,    // NEW: For spinner
  Snackbar,            // NEW: For alerts
  Alert,               // NEW: For alerts
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useParams } from 'react-router-dom';
import { format, parseISO, parse, format as formatDateFn } from 'date-fns';

// Role colors
const roleColors = {
  Management: '#006400', // Green
  Waiters: '#9C27B0',    // Purple
  Cooks: '#795548',      // Brown
  Bar: '#2196F3',        // Blue
};
const defaultRoleColor = '#9E9E9E'; // gray if role not found

const DayView = () => {
  const { date } = useParams();
  const [formattedDate, setFormattedDate] = useState('');
  const API_URL = process.env.REACT_APP_API_URL;

  // All possible roles
  const roles = ["Management", "Waiters", "Cooks", "Bar"];

  // Default new-task structure
  const defaultTask = {
    title: '',
    details: '',
    status: 'In Progress',
    shouldAddImage: false,
    notifyMethod: 'interval',  // 'interval' | 'fixed' | 'none'
    noticeInterval: 1,
    noticeTime: '',
    firstTimeMessageMethod: 'now',
    firstTimeMessageTime: '',
    duration: 'daily',         // 'daily' | 'weekly' | 'monthly'
  };

  // State grouping tasks by role
  const [tasksByRole, setTasksByRole] = useState(
    roles.reduce((acc, role) => {
      acc[role] = [];
      return acc;
    }, {})
  );

  // NEW: loading state for spinner
  const [loading, setLoading] = useState(false);

  // NEW: Snackbar for success/error messages
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Dialog states
  const [openNewTaskDialog, setOpenNewTaskDialog] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);

  // Form state for creating a new task
  const [taskForm, setTaskForm] = useState(defaultTask);

  // Fetch tasks when `date` changes
  useEffect(() => {
    if (!date) return;

    const parsed = parseISO(date);
    setFormattedDate(format(parsed, 'MMMM d, yyyy'));

    const fetchTasks = async () => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${date}`);
        const data = await response.json();
        setTasksByRole(groupTasksByRole(data));
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Error fetching tasks', severity: 'error' });
      }
    };
    fetchTasks();
  }, [date, API_URL]);

  // Group tasks by role
  function groupTasksByRole(tasks) {
    const rolesMap = roles.reduce((acc, role) => {
      acc[role] = [];
      return acc;
    }, {});

    tasks.forEach((task) => {
      if (!rolesMap[task.role]) {
        rolesMap[task.role] = [];
      }
      rolesMap[task.role].push(task);
    });

    return rolesMap;
  }
  const handleCreateNewTaskClick = (role) => {
    // Reset 
    console.log(role)
    setCurrentRole(role)
    setTaskForm(defaultTask);
    setOpenNewTaskDialog(true);
  };

  // New Task Dialog
  const handleCloseNewTaskDialog = () => {
    setOpenNewTaskDialog(false);
    setCurrentRole(null);
    setTaskForm(defaultTask);
  };

  // Detect Hebrew for text alignment
  const handleFormChange = (field, value) => {
    const isHebrew = /[\u0590-\u05FF]/.test(value);
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
      [`${field}Dir`]: isHebrew ? 'rtl' : 'ltr',
    }));
  };

  // Save new task
  const handleSaveTask = async () => {
    if (!currentRole || loading) return;
    setLoading(true);

    const newTask = {
      ...taskForm,
      role: currentRole,
    };

    try {
      const response = await fetch(`${API_URL}/api/tasks/addTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Task successfully added:', result);
        setSnackbar({ open: true, message: 'Task added successfully!', severity: 'success' });

        setTasksByRole((prev) => ({
          ...prev,
          [currentRole]: [...prev[currentRole], { ...newTask }],
        }));
        handleCloseNewTaskDialog();
      } else {
        console.error('Error adding task:', result.error);
        setSnackbar({
          open: true,
          message: result.error || 'Failed to add task',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while adding the task.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Render the "Notice" column text
  const renderNoticeText = (task) => {
    const { notifyMethod, noticeInterval, noticeTime } = task;
    if (notifyMethod === 'interval') {
      return `Every ${noticeInterval || 1} hours`;
    }
    if (notifyMethod === 'fixed') {
      if (!noticeTime) return 'At --:--';
      try {
        const parsedTime = parse(noticeTime, 'HH:mm', new Date());
        const displayTime = formatDateFn(parsedTime, 'h:mm aa'); // e.g. "4:00 PM"
        return `At ${displayTime}`;
      } catch {
        return `At ${noticeTime}`;
      }
    }
    // notifyMethod === 'none'
    return 'No Notice';
  };

  return (
    <Box sx={{ bgcolor: '#f8f9fa', py: 4, minHeight: '100vh' }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 3 }}>
          Tasks for {formattedDate || '...'}
        </Typography>

        {/* Dialog B: New Task Form */}
        <Dialog open={openNewTaskDialog} onClose={handleCloseNewTaskDialog} fullWidth maxWidth="sm">
          <DialogTitle>Create a New Task</DialogTitle>
          <DialogContent dividers>
            {/* TITLE */}
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              margin="normal"
              value={taskForm.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              inputProps={{ dir: taskForm.titleDir || 'ltr' }}
              required
            />
            {/* DETAILS */}
            <TextField
              label="Details"
              variant="outlined"
              fullWidth
              multiline
              rows={2}
              margin="normal"
              value={taskForm.details}
              onChange={(e) => handleFormChange('details', e.target.value)}
              inputProps={{ dir: taskForm.detailsDir || 'ltr' }}
            />

            {/* RADIO: Notification Method */}
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Notification Method
            </Typography>
            <FormControlLabel
              control={<Radio
                checked={taskForm.notifyMethod === 'interval'}
                onChange={() => handleFormChange('notifyMethod', 'interval')}
              />}
              label="Every X hours"
            />
            <FormControlLabel
              control={<Radio
                checked={taskForm.notifyMethod === 'fixed'}
                onChange={() => handleFormChange('notifyMethod', 'fixed')}
              />}
              label="Fixed Time"
            />
            <FormControlLabel
              control={<Radio
                checked={taskForm.notifyMethod === 'none'}
                onChange={() => handleFormChange('notifyMethod', 'none')}
              />}
              label="No Notice"
            />

            {/* If notifyMethod='interval', show noticeInterval input */}
            {taskForm.notifyMethod === 'interval' && (
              <TextField
                label="Interval (hours)"
                type="number"
                variant="outlined"
                fullWidth
                margin="normal"
                value={taskForm.noticeInterval}
                onChange={(e) =>
                  handleFormChange('noticeInterval', parseInt(e.target.value) || 1)
                }
              />
            )}

            {/* If notifyMethod='fixed', show noticeTime input */}
            {taskForm.notifyMethod === 'fixed' && (
              <TextField
                label="Notify at (time)"
                type="time"
                variant="outlined"
                fullWidth
                margin="normal"
                value={taskForm.noticeTime}
                onChange={(e) => handleFormChange('noticeTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}

            {/* First Time Message */}
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              First Time Message
            </Typography>
            <FormControlLabel
              control={<Radio
                checked={taskForm.firstTimeMessageMethod === 'now'}
                onChange={() => handleFormChange('firstTimeMessageMethod', 'now')}
              />}
              label="Right Now"
            />
            <FormControlLabel
              control={<Radio
                checked={taskForm.firstTimeMessageMethod === 'fixed'}
                onChange={() => handleFormChange('firstTimeMessageMethod', 'fixed')}
              />}
              label="Fixed Time"
            />

            {taskForm.firstTimeMessageMethod === 'fixed' && (
              <TextField
                label="Send First Message at"
                type="time"
                variant="outlined"
                fullWidth
                margin="normal"
                value={taskForm.firstTimeMessageTime}
                onChange={(e) => handleFormChange('firstTimeMessageTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}

            {/* SHOULD ADD IMAGE (switch) */}
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch
                  checked={taskForm.shouldAddImage}
                  onChange={(e) => handleFormChange('shouldAddImage', e.target.checked)}
                />}
                label="Should Add Image"
                sx={{ mt: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseNewTaskDialog} disabled={loading}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveTask} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* SNACKBAR for Success/Error Alerts */}
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

        {/* ACCORDION for each role */}
        {Object.keys(tasksByRole).map((role) => {
          const color = roleColors[role] || defaultRoleColor;
          const tasks = tasksByRole[role];

          return (
            <Accordion key={role} defaultExpanded sx={{ mb: 2, borderLeft: `6px solid ${color}` }}>
              {/* Accordion Header */}
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color, mr: 2 }}>
                    {role}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={`Add task to ${role}`}>
                    <IconButton color="primary" onClick={() => handleCreateNewTaskClick(role)}>
                      <AddCircleOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                {tasks.length === 0 ? (
                  <Typography sx={{ textAlign: 'center', color: 'gray', py: 2 }}>
                    No tasks available. Click the <b>+</b> icon to add a new task.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} elevation={0}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Task</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: '45%' }}>Details</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 'bold', width: '15%' }}>
                            Status
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Notice</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>duration</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tasks.map((task, i) => (
                          <TableRow key={i}>
                            <TableCell>{task.title}</TableCell>
                            <TableCell sx={{ color: 'gray' }}>{task.details || '--'}</TableCell>
                            <TableCell align="left">
                              <Chip
                                label={task.status}
                                sx={{
                                  backgroundColor:
                                    task.status === 'Done'
                                      ? '#4caf50'
                                      : task.status === 'Stuck'
                                      ? '#f44336'
                                      : '#ffc107',
                                  color: '#fff',
                                  fontWeight: 'bold',
                                  width: 100,
                                }}
                              />
                            </TableCell>
                            <TableCell>{renderNoticeText(task)}</TableCell>
                            <TableCell>{task.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Container>
    </Box>
  );
};

export default DayView;
