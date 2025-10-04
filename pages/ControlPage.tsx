import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyRecord, Motorista, Gestor } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DriverRow } from '../components/DriverRow';
import { Search, Filter } from 'lucide-react';
import { STATUS_OPCOES } from '../constants';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

// Helper to get today's date at midnight
const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
    const { user } = useAuth();
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [date, setDate] = useState<Date>(getTodayDate());

    const fetchAndCreateRecords = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch drivers
            let driversQuery;
            if (isAdmin) {
                driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'), orderBy('nome'));
            } else if (gestorProfile) {
                driversQuery = query(collection(db, 'motoristas'), where('gestor', '==', gestorProfile.nome), where('statusEmprego', '==', 'ATIVO'), orderBy('nome'));
            } else {
                setLoading(false);
                setError("Perfil de gestor não encontrado.");
                return;
            }

            const driversSnapshot = await getDocs(driversQuery);
            const drivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
            
            // 2. For each driver, find or create today's record
            const dateStr = date.toISOString().split('T')[0];
            const recordPromises = drivers.map(async (driver) => {
                const recordId = `${dateStr}_${driver.id}`;
                const recordRef = doc(db, 'dailyRecords', recordId);
                const recordSnap = await getDoc(recordRef);

                if (recordSnap.exists()) {
                    const data = recordSnap.data();
                    return { ...data, id: recordSnap.id, data: (data.data as Timestamp).toDate() } as DailyRecord;
                } else {
                    // Create a new record for today
                    const newRecord: DailyRecord = {
                        id: recordId,
                        motorista: driver.nome,
                        data: date,
                        gestor: driver.gestor,
                        status: 'JORNADA', // Default status
                        statusViagem: 'EM VIAGEM', // Default
                        horaExtra: 'NÃO AUTORIZADO', // Default
                        lastModifiedBy: user.email!,
                    };
                    await setDoc(recordRef, {
                        ...newRecord,
                        data: Timestamp.fromDate(date) // Store as Timestamp
                    });
                    return newRecord;
                }
            });

            const dailyRecords = await Promise.all(recordPromises);
            setRecords(dailyRecords);

        } catch (err) {
            console.error("Error fetching records:", err);
            setError("Falha ao carregar os registros. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, gestorProfile, date]);

    useEffect(() => {
        fetchAndCreateRecords();
    }, [fetchAndCreateRecords]);

    const handleRecordUpdate = (updatedRecord: DailyRecord) => {
        setRecords(prevRecords =>
            prevRecords.map(record =>
                record.id === updatedRecord.id ? updatedRecord : record
            )
        );
        // Optionally re-fetch to ensure consistency, but local update is faster for UI.
        // fetchAndCreateRecords();
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset()); // Adjust for timezone
        setDate(newDate);
    };
    
    const filteredRecords = records.filter(record =>
        record.motorista.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (statusFilter === '' || record.status === statusFilter)
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                 <div className="flex-1">
                    <label htmlFor="control-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Data do Controle
                    </label>
                    <input
                        type="date"
                        id="control-date"
                        value={date.toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="mt-1 block w-full sm:w-auto rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar motorista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                     <div className="relative w-full sm:w-56">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Todos os Status</option>
                            {STATUS_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {loading && <p className="text-center py-8">Carregando registros...</p>}
            {error && <p className="text-center py-8 text-red-500">{error}</p>}
            {!loading && !error && (
                <div className="space-y-4">
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map(record => (
                            <DriverRow key={record.id} record={record} onUpdate={handleRecordUpdate} />
                        ))
                    ) : (
                        <p className="text-center py-8 text-slate-500 dark:text-slate-400">Nenhum registro encontrado para os filtros selecionados.</p>
                    )}
                </div>
            )}
        </div>
    );
};
