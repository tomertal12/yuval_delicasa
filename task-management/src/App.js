import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './HomePage';
import DayView from './DayView';
import EmployeesPage from './EmployeesPage';
import TasksPage from './TasksPage';
import SettingsPage from './SettingsPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="day/:date" element={<DayView />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

export default App;
