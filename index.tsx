// FIX: Removed invalid "--- START OF FILE ---" text from the beginning of the file.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './hooks/useAuth';

const AppRouter: React.FC = () => {
    const { user, authError, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 text-white">Carregando...</div>;
    }

    if (authError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 text-red-500 p-4">
                <h2 className="text-xl font-bold mb-4">Erro de Configuração</h2>
                <p className="text-center">{authError}</p>
                <p className="mt-4 text-sm text-slate-400">Por favor, contate o administrador do sistema.</p>
            </div>
        );
    }
    
    // Se não houver usuário, AuthProvider renderizará LoginPage internamente
    return <App />;
};


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);