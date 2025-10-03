import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { ControlPage } from './pages/ControlPage';
import { BusinessRulesPage } from './pages/BusinessRulesPage';

type ActiveTab = 'control' | 'rules';

const App: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('control');

    const getTabClassName = (tabName: ActiveTab) => {
        const isActive = activeTab === tabName;
        return `px-3 py-2 font-medium text-sm rounded-md transition-colors ${
            isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`;
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Header user={user} onLogout={logout} />

                {/* Navigation Tabs */}
                <div className="mt-6 border-b border-slate-300 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('control')} className={getTabClassName('control')}>
                            Controle Diário
                        </button>
                        <button onClick={() => setActiveTab('rules')} className={getTabClassName('rules')}>
                            Regras de Negócio
                        </button>
                    </nav>
                </div>

                {/* Page Content */}
                <div className="mt-6">
                    {activeTab === 'control' && user && <ControlPage user={user} />}
                    {activeTab === 'rules' && <BusinessRulesPage />}
                </div>
            </main>
        </div>
    );
};

export default App;
