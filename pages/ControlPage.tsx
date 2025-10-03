// Fix: Implemented the ControlPage component to manage driver logs.
import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { DailyLog } from '../types';
import { DriverRow } from '../components/DriverRow';
import { PlusCircle, Search } from 'lucide-react';

export const ControlPage: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;

        setIsLoading(true);
        const logsCollection = collection(db, 'dailyLogs');
        const q = query(logsCollection, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as DailyLog));
            setLogs(logsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching logs: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleAddRow = async () => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'dailyLogs'), {
                userId: user.uid,
                driverName: '',
                statusGeral: 'JORNADA',
                statusViagem: 'EM VIAGEM',
                horaExtra: 'NÃO AUTORIZADO',
                observacao: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error adding new log: ", error);
            alert('Falha ao adicionar novo registro. Tente novamente.');
        }
    };

    const handleUpdateLog = useCallback((id: string, field: keyof Omit<DailyLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, value: string) => {
        setLogs(prevLogs =>
            prevLogs.map(log =>
                log.id === id ? { ...log, [field]: value } : log
            )
        );
    }, []);

    const handleSaveLog = async (id: string) => {
        const logToSave = logs.find(log => log.id === id);
        if (!logToSave) return;

        setIsSaving(id);
        try {
            const logRef = doc(db, 'dailyLogs', id);
            const { id: logId, ...dataToSave } = logToSave;
            await updateDoc(logRef, {
                ...dataToSave,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error updating log: ", error);
            alert('Falha ao salvar o registro. Tente novamente.');
        } finally {
            setIsSaving(null);
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                await deleteDoc(doc(db, 'dailyLogs', id));
            } catch (error) {
                console.error("Error deleting log: ", error);
                alert('Falha ao excluir o registro. Tente novamente.');
            }
        }
    };
    
    const filteredLogs = logs.filter(log =>
        log.driverName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por motorista..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full p-2 pl-10 text-sm text-slate-900 border border-slate-300 rounded-lg bg-slate-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={handleAddRow}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
                >
                    <PlusCircle className="h-5 w-5" />
                    <span>Adicionar Registro</span>
                </button>
            </div>
            <div className="overflow-x-auto shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                        <tr>
                            <th scope="col" className="px-4 py-3">Motorista</th>
                            <th scope="col" className="px-4 py-3">Status Geral</th>
                            <th scope="col" className="px-4 py-3">Status Viagem</th>
                            <th scope="col" className="px-4 py-3">Hora Extra</th>
                            <th scope="col" className="px-4 py-3">Observação</th>
                            <th scope="col" className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-4">Carregando dados...</td></tr>
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map(log => (
                                <DriverRow
                                    key={log.id}
                                    log={log}
                                    onUpdate={handleUpdateLog}
                                    onSave={handleSaveLog}
                                    onDelete={handleDeleteLog}
                                    isSaving={isSaving === log.id}
                                />
                            ))
                        ) : (
                            <tr><td colSpan={6} className="text-center p-4">Nenhum registro encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
