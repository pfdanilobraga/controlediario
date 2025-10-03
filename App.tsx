import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where, addDoc, serverTimestamp, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './hooks/useAuth';
import { DailyRecord } from './types';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import { Search, PlusCircle, Save } from 'lucide-react';

const App: React.FC = () => {
    const { user, logout } = useAuth();
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!user || !user.email || !startDate || !endDate) return;

        setLoading(true);
        setDirtyRecords(new Map()); // Clear pending changes on new fetch

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const recordsCollection = collection(db, 'daily_records');
        const q = query(
            recordsCollection,
            where("gestor", "==", user.email),
            where("data", ">=", Timestamp.fromDate(start)),
            where("data", "<=", Timestamp.fromDate(end)),
            orderBy('data', 'asc'),
            orderBy('motorista', 'asc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const recordsData: DailyRecord[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                recordsData.push({
                    id: doc.id,
                    ...data,
                    data: (data.data as Timestamp).toDate(),
                } as DailyRecord);
            });
            setRecords(recordsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching documents: ", error);
            alert('Falha ao carregar os dados. Verifique se o índice do Firestore foi criado corretamente (em daily_records: gestor ASC, data ASC, motorista ASC).');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, startDate, endDate]);

    const handleRecordUpdate = useCallback((updatedRecord: DailyRecord) => {
        // Update local state for immediate UI feedback
        setRecords(prevRecords => prevRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r));
        // Add to dirty records to be saved
        setDirtyRecords(prev => new Map(prev).set(updatedRecord.id, updatedRecord));
    }, []);

    const handleSaveChanges = async () => {
        if (dirtyRecords.size === 0) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            dirtyRecords.forEach((record) => {
                const recordRef = doc(db, 'daily_records', record.id);
                const { id, ...dataToSave } = record;
                batch.update(recordRef, { ...dataToSave, data: Timestamp.fromDate(new Date(dataToSave.data)) });
            });
            await batch.commit();
            setDirtyRecords(new Map());
        } catch (error) {
            console.error("Error saving documents: ", error);
            alert("Ocorreu um erro ao salvar as alterações.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddDriver = async () => {
        if (!user || !user.email) return;
        try {
            await addDoc(collection(db, 'daily_records'), {
                motorista: 'Novo Motorista - Edite o nome',
                gestor: user.email,
                data: serverTimestamp(),
                status: 'JORNADA',
                statusViagem: '',
                horaExtra: 'NÃO AUTORIZADO',
            });
        } catch (error) {
            console.error("Error adding new driver: ", error);
        }
    };

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        const lowercasedFilter = searchTerm.toLowerCase();
        return records.filter(item =>
            (item.motorista?.toLowerCase() || '').includes(lowercasedFilter) ||
            (item.placas?.toLowerCase() || '').includes(lowercasedFilter)
        );
    }, [searchTerm, records]);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Header user={user} onLogout={logout} />

                <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <div className="p-4 sm:p-6 border-b dark:border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 flex-wrap">
                        {/* Date and Search Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-2">
                                <label htmlFor="start-date" className="text-sm font-medium">De:</label>
                                <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="end-date" className="text-sm font-medium">Até:</label>
                                <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
                            </div>
                            <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                               <input type="text" placeholder="Buscar motorista/placa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                             <button onClick={handleAddDriver} className="action-button bg-blue-600 hover:bg-blue-700">
                                <PlusCircle className="h-5 w-5" />
                                <span>Adicionar Registro</span>
                            </button>
                            <button onClick={handleSaveChanges} disabled={isSaving || dirtyRecords.size === 0} className="action-button bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="h-5 w-5" />}
                                <span>Salvar Alterações ({dirtyRecords.size})</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                             <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 min-w-[200px]">Motorista</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Placas</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Alt. Status</th>
                                    <th className="px-4 py-3">Just. Alt. Status</th>
                                    <th className="px-4 py-3">Status Viagem</th>
                                    <th className="px-4 py-3">Just. Status Viagem</th>
                                    <th className="px-4 py-3">Hora Extra</th>
                                    <th className="px-4 py-3">Just. Hora Extra</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={11} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p className="mt-2">Carregando registros...</p></td></tr>
                                ) : filteredRecords.length > 0 ? (
                                    filteredRecords.map(record => (
                                        <DriverRow key={record.id} record={record} onUpdate={handleRecordUpdate} />
                                    ))
                                ) : (
                                     <tr><td colSpan={11} className="text-center py-8"><p>Nenhum registro encontrado para o período.</p><p className="text-xs text-slate-400">Ajuste as datas ou adicione um novo registro.</p></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            <style>{`
                .form-input {
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    border: 1px solid #cbd5e1;
                    background-color: #f8fafc;
                }
                .dark .form-input {
                    border-color: #475569;
                    background-color: #334155;
                    color: #e2e8f0;
                }
                .action-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    color: white;
                    font-weight: 600;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 150ms;
                }
            `}</style>
        </div>
    );
};

export default App;