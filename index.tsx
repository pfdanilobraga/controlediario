import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';

const AppContainer: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
                <div className="text-slate-900 dark:text-white">Carregando...</div>
            </div>
        );
    }

    return user ? <App /> : <LoginPage />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <AuthProvider>
            <AppContainer />
        </AuthProvider>
    </React.StrictMode>
);
