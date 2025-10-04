// Fix: The original file content was duplicated and contained extraneous markers,
// causing multiple syntax and redeclaration errors. The file has been cleaned
// to contain only the correct, single version of the code.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';

// Este componente decide o que renderizar com base no estado de autenticação
const AppRouter: React.FC = () => {
    const { user, loading, authError } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
                <div className="text-slate-900 dark:text-white">Carregando...</div>
            </div>
        );
    }

    // Se houver um erro de autenticação (ex: perfil de gestor não encontrado), exibe o erro.
    if (authError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-red-500 mb-4">Erro de Configuração</h2>
                    <p className="text-slate-700 dark:text-slate-300">{authError}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm">Por favor, contate o administrador do sistema.</p>
                </div>
            </div>
        );
    }
    
    // Se não houver erro, decide entre a página de login e a aplicação principal.
    return user ? <App /> : <LoginPage />;
};


const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    </React.StrictMode>
);