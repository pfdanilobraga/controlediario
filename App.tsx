import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { ControlPage } from './pages/ControlPage';
// Fix: Update the import path for `DriverManagementPage` to point to the correct file `pages/BusinessRulesPage.tsx`, resolving a module not found error.
import { DriverManagementPage } from './pages/BusinessRulesPage';
import { Users, UserCog } from 'lucide-react';

type Page = 'control' | 'drivers';

const App: React.FC = () => {
    const { user, logout, gestorProfile } = useAuth();
    const [activePage, setActivePage] = useState<Page>('control');

    // Define o administrador com base no e-mail
    const isAdmin = user?.email === 'adm@adm.com';

    const renderPage = () => {
        switch (activePage) {
            case 'control':
                return <ControlPage isAdmin={isAdmin} gestorProfile={gestorProfile} />;
            case 'drivers':
                // A página de gerenciamento só é renderizada se for admin
                return isAdmin ? <DriverManagementPage /> : <p className="text-center text-red-500">Acesso negado.</p>;
            default:
                return <ControlPage isAdmin={isAdmin} gestorProfile={gestorProfile} />;
        }
    };
    
    const NavButton: React.FC<{ page: Page; label: string; icon: React.ReactNode }> = ({ page, label, icon }) => (
        <button
            onClick={() => setActivePage(page)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activePage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Header user={user} onLogout={logout} />
                <main className="mt-8">
                    <nav className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <NavButton page="control" label="Controle Diário" icon={<Users className="h-5 w-5" />} />
                        {isAdmin && (
                             <NavButton page="drivers" label="Gerenciar Motoristas" icon={<UserCog className="h-5 w-5" />} />
                        )}
                    </nav>
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default App;