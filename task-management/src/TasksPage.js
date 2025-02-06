import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
// or use any other delete/trash icon
import TasksDialog from './components/TasksDialog';

const roleColors = {
  Management: '#006400', // dark green
  Waiters: '#9C27B0',
  Cooks: '#795548',
  Bar: '#2196F3',
  default: '#9E9E9E',
};

// Group tasks by role helper
function groupTasksByRole(tasks) {
  const grouped = {};
  tasks.forEach((task) => {
    const r = task.role || 'Unassigned';
    if (!grouped[r]) grouped[r] = [];
    grouped[r].push(task);
  });
  return grouped;
}

const TasksPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [tasks, setTasks] = useState({
    daily: [],
    weekly: [],
    monthly: [],
  });

  // For creating tasks
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDuration, setDialogDuration] = useState('daily');

  // For deleting tasks
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Snackbar for success/error messages
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Helper to fetch tasks from the server
  const fetchTasksByDuration = async (duration) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks?duration=${duration}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`Failed to fetch ${duration} tasks:`, err);
      return [];
    }
  };

  // On mount, load all durations
  useEffect(() => {
    (async () => {
      const dailyData = await fetchTasksByDuration('daily');
      const weeklyData = await fetchTasksByDuration('weekly');
      const monthlyData = await fetchTasksByDuration('monthly');
      setTasks({
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
      });
    })();
  }, []);

  // Decide which tasks array we’re viewing
  const getCurrentTabDuration = () => {
    if (tabValue === 0) return 'daily';
    if (tabValue === 1) return 'weekly';
    return 'monthly';
  };
  const getCurrentTabTasks = () => {
    return tasks[getCurrentTabDuration()] || [];
  };

  // For tab switching
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // After creating a new task
  const handleTaskCreated = async () => {
    setDialogOpen(false);
    const duration = getCurrentTabDuration();
    const updated = await fetchTasksByDuration(duration);
    setTasks((prev) => ({ ...prev, [duration]: updated }));
  };

  // Open the "Add Task" dialog
  const handleOpenDialog = () => {
    const duration = getCurrentTabDuration();
    setDialogDuration(duration);
    setDialogOpen(true);
  };

  // -------------- Deleting Tasks -------------- //
  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Task deleted successfully!',
          severity: 'success',
        });
        // Refresh tasks
        const duration = getCurrentTabDuration();
        const updated = await fetchTasksByDuration(duration);
        setTasks((prev) => ({ ...prev, [duration]: updated }));
      } else {
        const result = await response.json();
        setSnackbar({
          open: true,
          message: result.error || 'Error deleting task',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setSnackbar({
        open: true,
        message: 'Network or server error while deleting task',
        severity: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  // -------------------------------------------- //

  const renderTasksByRole = (taskArray) => {
    if (!taskArray || taskArray.length === 0) {
      return (
        <Typography sx={{ textAlign: 'center', py: 2, color: 'gray' }}>
          No tasks found.
        </Typography>
      );
    }

    const grouped = groupTasksByRole(taskArray);

    return Object.entries(grouped).map(([role, roleTasks]) => {
      const borderColor = roleColors[role] || roleColors.default;
      return (
        <Paper
          key={role}
          elevation={2}
          sx={{
            mb: 3,
            borderLeft: `8px solid ${borderColor}`,
            p: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 1, fontWeight: 'bold', color: borderColor }}
          >
            {role}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Notify</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Next Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>First Messege</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: 60 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roleTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.title}</TableCell>
                    <TableCell sx={{ color: '#555' }}>
                      {task.details || '--'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status || 'In Progress'}
                        color={
                          task.status === 'Done'
                            ? 'success'
                            : task.status === 'Stuck'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {task.notifyMethod === 'interval'
                        ? `Every ${task.noticeInterval}h`
                        : task.notifyMethod === 'fixed'
                        ? `Fixed @ ${task.noticeTime}`
                        : 'None'}
                    </TableCell>
                    <TableCell>
                      {task.nextNotificationTime || '--'}
                    </TableCell>
                    <TableCell>
                      {task.firstTimeMessageTime || '--'}
                    </TableCell>

                    
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(task)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                      {/* In the future, you can add Edit or other actions here */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    });
  };

  return (
    <Box sx={{ bgcolor: '#fafafa', py: 4, minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            Tasks
          </Typography>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            sx={{ mb: 2 }}
          >
            <Tab label="Daily" />
            <Tab label="Weekly" />
            <Tab label="Monthly" />
          </Tabs>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleOpenDialog}
            >
              Add Task
            </Button>
          </Box>

          {/* Render tasks grouped by role */}
          {renderTasksByRole(getCurrentTabTasks())}
        </Paper>
      </Container>

      {/* ADD TASK DIALOG */}
      <TasksDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        duration={dialogDuration}
        onTaskCreated={handleTaskCreated}
        availableRoles={["Management", "Waiters", "Cooks", "Bar"]}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {taskToDelete
              ? `Are you sure you want to delete the task "${taskToDelete.title}"? This action cannot be undone.`
              : 'Are you sure you want to delete this task?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} autoFocus>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
};

export default TasksPage;
