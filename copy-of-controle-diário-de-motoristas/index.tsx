import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './hooks/useAuth';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Carregando aplicação...</p>
      </div>
    );
  }

  return user ? <App /> : <LoginPage />;
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);
