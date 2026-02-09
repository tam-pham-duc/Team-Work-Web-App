import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TimeTrackerProvider, useTimeTracker } from './contexts/TimeTrackerContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { FloatingTimeTracker } from './components/tasks/FloatingTimeTracker';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { TasksPage } from './pages/TasksPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TeamSpacePage } from './pages/TeamSpacePage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { IssuesPage } from './pages/IssuesPage';
import { TrashPage } from './pages/TrashPage';
import { ReportsPage } from './pages/ReportsPage';
import { CalculationPage } from './pages/CalculationPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-600 mt-2">This module will be implemented in a future update.</p>
    </div>
  );
}

function GlobalFloatingTracker() {
  const { activeTrackerTask, closeTracker } = useTimeTracker();

  if (!activeTrackerTask) return null;

  return (
    <FloatingTimeTracker
      taskId={activeTrackerTask.taskId}
      taskTitle={activeTrackerTask.taskTitle}
      projectName={activeTrackerTask.projectName}
      onClose={closeTracker}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TimeTrackerProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/team-space" element={<TeamSpacePage />} />
              <Route path="/team-space/:id" element={<DocumentDetailPage />} />
              <Route path="/time" element={<PlaceholderPage title="Time Logs" />} />
              <Route path="/issues" element={<IssuesPage />} />
              <Route path="/calculator" element={<CalculationPage />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredPermission="admin.access">
                    <PlaceholderPage title="Settings" />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
          <GlobalFloatingTracker />
        </TimeTrackerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
