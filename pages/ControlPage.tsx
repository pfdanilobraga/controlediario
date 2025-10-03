import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyRecord, Gestor, Motorista } from '../types';
import { DriverRow } from '../components/DriverRow';
import { PlusCircle, Search } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<DailyRecord[]>([]);
    const [drivers, setDrivers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const recordsCollection = collection(db, 'daily_records');
            let q;

            // Define start and end of the selected day
            const startOfDay = new Date(selectedDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            
            const startTimestamp = Timestamp.fromDate(startOfDay);
            const endTimestamp = Timestamp.fromDate(endOfDay);
            
            if (isAdmin) {
                q = query(recordsCollection, where('data', '>=', startTimestamp), where('data', '<=', endTimestamp), orderBy('data', 'desc'), orderBy('motorista'));
            } else if (gestorProfile?.motoristas && gestorProfile.motoristas.length > 0) {
                 q = query(recordsCollection, where('motorista', 'in', gestorProfile.motoristas), where('data', '>=', startTimestamp), where('data', '<=', endTimestamp), orderBy('data', 'desc'), orderBy('motorista'));
            } else {
                 setRecords([]);
                 setFilteredRecords([]);
                 setLoading(false);
                 return;
            }
            
            const recordsSnapshot = await getDocs(q);
            const recordsList = recordsSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id,
                    ...data,
                    data: (data.data as Timestamp).toDate() 
                } as DailyRecord
            });
            setRecords(recordsList);
            setFilteredRecords(recordsList);
        } catch (error) {
            console.error("Error fetching records: ", error);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, gestorProfile, selectedDate]);
    
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);
    
     useEffect(() => {
        const fetchDrivers = async () => {
            if (isAdmin) {
                 const driversCollection = collection(db, 'motoristas');
                 const driversSnapshot = await getDocs(driversCollection);
                 const driversList = driversSnapshot.docs.map(doc => (doc.data() as Motorista).nome);
                 setDrivers(driversList.sort());
            } else if (gestorProfile) {
                setDrivers(gestorProfile.motoristas.sort());
            }
        };
        fetchDrivers();
    }, [isAdmin, gestorProfile]);

    useEffect(() => {
        const filtered = records.filter(record =>
            record.motorista.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredRecords(filtered);
    }, [searchTerm, records]);

    const handleUpdate = async (id: string, field: keyof DailyRecord, value: any) => {
        try {
            const recordDoc = doc(db, 'daily_records', id);
            await updateDoc(recordDoc, { [field]: value });
            // Optimistic update
            setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
        } catch (error) {
            console.error("Error updating record: ", error);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm('Tem certeza que deseja excluir este registro?')) {
            try {
                await deleteDoc(doc(db, 'daily_records', id));
                // Optimistic delete
                setRecords(prev => prev.filter(r => r.id !== id));
            } catch (error) {
                console.error("Error deleting record: ", error);
            }
        }
    };
    
    const handleAddRecordsForDrivers = async () => {
        if (!drivers.length) return;
        setLoading(true);
        const newRecordDate = new Date(selectedDate);
        newRecordDate.setUTCHours(12, 0, 0, 0); // Set to midday to avoid timezone issues
        const newRecordTimestamp = Timestamp.fromDate(newRecordDate);

        const recordsToAdd = drivers.map(driverName => ({
            motorista: driverName,
            data: newRecordTimestamp,
            gestor: gestorProfile?.nome || 'Admin',
            placas: '',
            status: 'JORNADA',
            statusViagem: '',
            horaExtra: 'NÃO AUTORIZADO',
            diasEmJornada: '',
            justificativaJornada: '',
        }));

        try {
            const recordsCollection = collection(db, 'daily_records');
            for (const record of recordsToAdd) {
                // Check if record for this driver and date already exists
                 const q = query(recordsCollection, 
                    where('motorista', '==', record.motorista), 
                    where('data', '>=', Timestamp.fromDate(new Date(new Date(selectedDate).setUTCHours(0, 0, 0, 0)))),
                    where('data', '<=', Timestamp.fromDate(new Date(new Date(selectedDate).setUTCHours(23, 59, 59, 999))))
                );
                const existing = await getDocs(q);
                if (existing.empty) {
                    await addDoc(recordsCollection, record);
                }
            }
            fetchRecords();
        } catch (error) {
            console.error("Error adding records: ", error);
        } finally {
            setLoading(false);
            setShowAddForm(false);
        }
    };
    

    return (
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Registros Diários</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                     <input 
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                     />
                    <button
                        onClick={() => setShowAddForm(prev => !prev)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
                    >
                        <PlusCircle className="h-5 w-5" />
                        <span>Adicionar</span>
                    </button>
                </div>
            </div>

            {showAddForm && (
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-6">
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                        Isso criará um novo registro para a data <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> para todos os motoristas sob sua gestão que ainda não possuem um registro. Deseja continuar?
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={handleAddRecordsForDrivers}
                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700"
                        >
                            Confirmar e Adicionar
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:bg-slate-400 dark:hover:bg-slate-500"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
            
             <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                   <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Filtrar por nome do motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                />
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="px-3 py-3">Motorista</th>
                            <th scope="col" className="px-3 py-3">Data</th>
                            <th scope="col" className="px-3 py-3">Gestor</th>
                            <th scope="col" className="px-3 py-3">Placas</th>
                            <th scope="col" className="px-3 py-3">Status</th>
                            <th scope="col" className="px-3 py-3">Status Viagem</th>
                            <th scope="col" className="px-3 py-3">Hora Extra</th>
                            <th scope="col" className="px-3 py-3">Dias em Jornada</th>
                            <th scope="col" className="px-3 py-3">{'Justificativa Jornada > 7 Dias'}</th>
                            <th scope="col" className="px-3 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="text-center py-4">Carregando registros...</td></tr>
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
                             <tr><td colSpan={10} className="text-center py-4">Nenhum registro encontrado para a data e filtros selecionados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};