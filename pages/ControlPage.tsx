import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where, addDoc, serverTimestamp, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyRecord } from '../types';
import { DriverRow } from '../components/DriverRow';
import { Search, PlusCircle, Save } from 'lucide-react';
import { User } from 'firebase/auth';

interface ControlPageProps {
    user: User;
}

export const ControlPage: React.FC<ControlPageProps> = ({ user }) => {
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const isAdmin = useMemo(() => user.email === 'adm@adm.com', [user.email]);
    const [selectedGestor, setSelectedGestor] = useState('');

    useEffect(() => {
        if (!user || !user.email || !startDate || !endDate) return;

        setLoading(true);
        setError(null);
        setDirtyRecords(new Map());

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const recordsCollection = collection(db, 'daily_records');
        
        let q;
        if (isAdmin) {
             q = query(
                recordsCollection,
                where("data", ">=", Timestamp.fromDate(start)),
                where("data", "<=", Timestamp.fromDate(end)),
                orderBy('data', 'asc'),
                orderBy('motorista', 'asc')
            );
        } else {
             q = query(
                recordsCollection,
                where("gestor", "==", user.email),
                where("data", ">=", Timestamp.fromDate(start)),
                where("data", "<=", Timestamp.fromDate(end)),
                orderBy('data', 'asc'),
                orderBy('motorista', 'asc')
            );
        }

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
        }, (err) => {
            console.error("Error fetching documents: ", err);
            const adminError = 'Índice necessário: data (ASC), motorista (ASC).';
            const userError = 'Índice necessário: gestor (ASC), data (ASC), motorista (ASC).';
            setError(`Falha ao carregar os dados. Verifique se os índices do Firestore foram criados. ${isAdmin ? adminError : userError}`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, startDate, endDate, isAdmin]);

    const gestores = useMemo(() => {
        const uniqueGestores = [...new Set(records.map(r => r.gestor).filter(Boolean))];
        return uniqueGestores.sort();
    }, [records]);

    const handleRecordUpdate = useCallback((updatedRecord: DailyRecord) => {
        setRecords(prevRecords => prevRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r));
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
        let result = records;
        if (isAdmin && selectedGestor) {
            result = result.filter(item => item.gestor === selectedGestor);
        }
        if (!searchTerm) return result;
        const lowercasedFilter = searchTerm.toLowerCase();
        return result.filter(item =>
            (item.motorista?.toLowerCase() || '').includes(lowercasedFilter) ||
            (item.placas?.toLowerCase() || '').includes(lowercasedFilter)
        );
    }, [searchTerm, records, isAdmin, selectedGestor]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
            <div className="p-4 sm:p-6 border-b dark:border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 flex-wrap">
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-center">
                    <div className="flex items-center gap-2">
                        <label htmlFor="start-date" className="text-sm font-medium">De:</label>
                        <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="end-date" className="text-sm font-medium">Até:</label>
                        <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
                    </div>
                    {isAdmin && (
                         <div className="flex items-center gap-2">
                             <label htmlFor="gestor-filter" className="text-sm font-medium">Gestor:</label>
                             <select id="gestor-filter" value={selectedGestor} onChange={e => setSelectedGestor(e.target.value)} className="form-input bg-white dark:bg-slate-700">
                                <option value="">Todos</option>
                                {gestores.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                         </div>
                    )}
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                       <input type="text" placeholder="Buscar motorista/placa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
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
                        {error ? (
                            <tr><td colSpan={11} className="text-center py-8 px-4 text-red-500"><p className="font-semibold">Ocorreu um erro ao carregar os dados.</p><p className="text-sm font-mono mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p></td></tr>
                        ) : loading ? (
                            <tr><td colSpan={11} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p className="mt-2">Carregando registros...</p></td></tr>
                        ) : filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                                <DriverRow key={record.id} record={record} onUpdate={handleRecordUpdate} />
                            ))
                        ) : (
                             <tr><td colSpan={11} className="text-center py-8"><p>Nenhum registro encontrado para os filtros selecionados.</p><p className="text-xs text-slate-400">Ajuste as datas/filtros ou adicione um novo registro.</p></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
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
