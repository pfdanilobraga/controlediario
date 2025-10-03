// Fix: Implemented the main App component with navigation and page rendering.
import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { ControlPage } from './pages/ControlPage';
import { BusinessRulesPage } from './pages/BusinessRulesPage';
import { Users, Filter } from 'lucide-react';

type Page = 'control' | 'business';

const App: React.FC = () => {
    const { user, logout } = useAuth();
    const [activePage, setActivePage] = useState<Page>('control');

    const renderPage = () => {
        switch (activePage) {
            case 'control':
                return <ControlPage />;
            case 'business':
                return <BusinessRulesPage />;
            default:
                return <ControlPage />;
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
                        <NavButton page="business" label="Regras e Análise" icon={<Filter className="h-5 w-5" />} />
                    </nav>
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default App;
