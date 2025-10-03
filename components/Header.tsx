import React from 'react';
import { User } from 'firebase/auth';
import { LogOut } from 'lucide-react';

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <header className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                    Controle Diário de Motoristas
                </h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    {currentDate}
                </p>
            </div>
            {user && (
                 <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Logado como</p>
                        <p className="font-medium text-slate-900 dark:text-white">{user.email}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
                        title="Sair da aplicação"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Sair</span>
                    </button>
                </div>
            )}
        </header>
    );
};
