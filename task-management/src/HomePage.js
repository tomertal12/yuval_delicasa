import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskIcon from '@mui/icons-material/Task';
import DeleteIcon from '@mui/icons-material/Delete';
import './css/CalendarHover.css'

// Import or require the date-fns locale you want:
const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

// Setup the localizer for react-big-calendar
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// A small function returning style/class for each day cell.
const dayPropGetter = (date) => {
  // Return a class name that we'll style in CSS to highlight hover
  return {
    className: 'rbc-day-hoverable',
    style: {
      cursor: 'pointer', // so user sees a pointer on hover
    },
  };
};

const HomePage = () => {
  const navigate = useNavigate();
  const [events] = useState([]);

  const [globalTasks, setGlobalTasks] = useState([
    { id: 1, title: 'Global Task A (short)', done: false },
    { id: 2, title: 'Global Task B - done example', done: true },
    {
      id: 3,
      title:
        'Global Task C (this is a very long task that should wrap onto multiple lines rather than use ellipsis).',
      done: false,
    },
    { id: 4, title: 'Task Four', done: false },
    { id: 5, title: 'Task Five', done: false },
    // Add more tasks as needed...
  ]);

  // When user clicks an empty slot in the calendar
  const handleSelectSlot = (slotInfo) => {
    navigate(`/day/${format(slotInfo.start, 'yyyy-MM-dd')}`);
  };

  // Toggle a task's "done" status
  const toggleTaskDone = (taskId) => {
    setGlobalTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  };

  // Delete a task
  const removeTask = (taskId) => {
    setGlobalTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
  };

  return (
    <Box
      sx={{
        // If you have no AppBar, you can use '100vh'
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
      }}
    >
      {/* Hero Banner with fixed height */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#ede7f6', // Light purple
          height: 60,
          px: 3,
          flexShrink: 0,
        }}
      >
        <TaskIcon sx={{ fontSize: 50, color: '#673ab7' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#4527a0', userSelect: 'none',}}>
            Welcome to Your Task Manager
          </Typography>
          <Typography variant="body2" sx={{ color: '#6a1b9a' ,  userSelect: 'none'}}>
            Let’s plan your day!
          </Typography>
        </Box>
      </Box>

      {/* Main Content (fills remaining space) */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            height: '100%',
            display: 'flex',
            overflow: 'hidden', // only tasks scroll
          }}
        >
          {/* LEFT: Calendar */}
          <Box
            sx={{
              flex: 1,
              mr: 2,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                views={['month']}
                defaultView="month"
                toolbar={false}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={(event) =>
                  navigate(`/day/${format(event.start, 'yyyy-MM-dd')}`)
                }
                dayPropGetter={dayPropGetter} // <--- highlight on hover
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </Box>
          </Box>

          {/* RIGHT: Sidebar with scrollable tasks */}
          <Box
            sx={{
              width: 300,
              bgcolor: '#f3e5f5',
              borderRadius: 2,
              p: 2,
              flexShrink: 0,
              overflowY: 'auto', // scroll only in tasks
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Global Tasks
            </Typography>

            <List sx={{ flex: 1 }}>
              {globalTasks.map((task) => (
                <ListItem
                  key={task.id}
                  // Align the checkbox and text in the same row
                  sx={{ display: 'flex', alignItems: 'center' }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => removeTask(task.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Checkbox
                    checked={task.done}
                    onChange={() => toggleTaskDone(task.id)}
                    // This ensures the checkbox is centered with text
                    sx={{ mt: 0 }} 
                  />
                  <ListItemText
                    primary={task.title}
                    primaryTypographyProps={{
                      style: {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '0.9rem',
                      },
                    }}
                    sx={{
                      cursor: 'default',
                      userSelect: 'none', // no text cursor on click
                      textDecoration: task.done ? 'line-through' : 'none',
                      color: task.done ? 'gray' : 'inherit',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default HomePage;
