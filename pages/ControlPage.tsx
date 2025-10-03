// Fix: Implement the ControlPage component to resolve module and content errors.
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { DailyRecord, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { Search, Filter, PlusCircle } from 'lucide-react';

interface ControlPageProps {
    isAdmin: boolean;
    gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<DailyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const recordsCollection = collection(db, 'dailyRecords');
            let q;
            if (isAdmin) {
                q = query(recordsCollection);
            } else if (gestorProfile) {
                q = query(recordsCollection, where('gestor', '==', gestorProfile.id));
            } else {
                setRecords([]);
                setFilteredRecords([]);
                setLoading(false);
                return;
            }

            const querySnapshot = await getDocs(q);
            const recordsList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    data: (data.data as Timestamp).toDate(),
                } as DailyRecord;
            });
            
            recordsList.sort((a, b) => b.data.getTime() - a.data.getTime() || a.motorista.localeCompare(b.motorista));

            setRecords(recordsList);
            setFilteredRecords(recordsList);
        } catch (err) {
            console.error("Error fetching records:", err);
            setError('Falha ao carregar registros. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, gestorProfile]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    useEffect(() => {
        let result = records;
        if (selectedDate) {
            const filterDate = new Date(selectedDate);
            // Adjust for timezone offset to compare dates correctly
            filterDate.setMinutes(filterDate.getMinutes() + filterDate.getTimezoneOffset());
            result = result.filter(r => r.data.toDateString() === filterDate.toDateString());
        }
        if (searchTerm) {
            result = result.filter(r => r.motorista.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredRecords(result);
    }, [searchTerm, selectedDate, records]);

    const handleUpdate = async (id: string, field: keyof DailyRecord, value: any) => {
        try {
            const recordRef = doc(db, 'dailyRecords', id);
            await updateDoc(recordRef, { [field]: value });
            // Optimistic update
            setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
        } catch (err) {
            console.error("Error updating record: ", err);
            setError('Falha ao atualizar registro.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) return;
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                await deleteDoc(doc(db, 'dailyRecords', id));
                setRecords(prev => prev.filter(r => r.id !== id));
            } catch (err) {
                console.error("Error deleting record: ", err);
                setError('Falha ao excluir registro.');
            }
        }
    };
    
    const handleAddTodaysRecords = async () => {
        if (!gestorProfile && !isAdmin) {
            setError("Perfil de gestor não encontrado para adicionar registros.");
            return;
        }

        if(!isAdmin && gestorProfile && gestorProfile.motoristas.length === 0){
             setError("Nenhum motorista associado a este gestor.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recordsForToday = records.filter(r => {
             const recordDate = new Date(r.data);
             recordDate.setHours(0,0,0,0);
             return recordDate.getTime() === today.getTime();
        });

        if (isAdmin) {
             // Admin needs to select a gestor first. This feature can be complex.
             // For now, let's say admin can't bulk-add, or it would add for all drivers.
             // Let's restrict this to gestores for simplicity.
             alert("Função de adicionar registros do dia disponível apenas para gestores.");
             return;
        }

        if (gestorProfile) {
            const driversForToday = recordsForToday.map(r => r.motorista);
            const driversToAdd = gestorProfile.motoristas.filter(m => !driversForToday.includes(m));

            if (driversToAdd.length === 0) {
                alert('Todos os motoristas deste gestor já possuem registro para hoje.');
                return;
            }

            setLoading(true);
            try {
                for (const driverName of driversToAdd) {
                    await addDoc(collection(db, 'dailyRecords'), {
                        motorista: driverName,
                        data: Timestamp.fromDate(today),
                        gestor: gestorProfile.id,
                        placas: '',
                        status: 'JORNADA',
                        statusViagem: '',
                        horaExtra: 'NÃO AUTORIZADO',
                        diasEmJornada: '',
                        justificativaJornada: '',
                    });
                }
                fetchRecords(); // Refresh data
            } catch (err) {
                console.error("Error adding today's records: ", err);
                setError("Falha ao adicionar registros de hoje.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por motorista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="relative flex-grow w-full sm:w-auto">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {!isAdmin && gestorProfile && (
                         <button 
                            onClick={handleAddTodaysRecords}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 whitespace-nowrap"
                        >
                            <PlusCircle className="h-5 w-5" />
                            <span>Lançar Dia</span>
                        </button>
                    )}
                </div>
            </div>

            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-center">{error}</p>}

            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="px-3 py-3">Motorista</th>
                            <th scope="col" className="px-3 py-3">Data</th>
                            <th scope="col" className="px-3 py-3">Gestor</th>
                            <th scope="col" className="px-3 py-3">Placas</th>
                            <th scope="col" className="px-3 py-3">Status</th>
                            <th scope="col" className="px-3 py-3">Status Viagem</th>
                            <th scope="col" className="px-3 py-3">Hora Extra</th>
                            <th scope="col" className="px-3 py-3">Dias em Jornada</th>
                            <th scope="col" className="px-3 py-3">Justificativa Jornada Contínua</th>
                            <th scope="col" className="px-3 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="text-center py-4">Carregando...</td></tr>
                        ) : filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                                <DriverRow 
                                    key={record.id} 
                                    record={record} 
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    isAdmin={isAdmin} 
                                />
                            ))
                        ) : (
                            <tr><td colSpan={10} className="text-center py-4">Nenhum registro encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
