import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './hooks/useAuth';
import { DailyRecord } from './types';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import { Search, PlusCircle } from 'lucide-react';

const App: React.FC = () => {
    const { user, logout } = useAuth();
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<DailyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user || !user.email) return;

        setLoading(true);
        const recordsCollection = collection(db, 'daily_records');
        // Assumes records are filtered by the manager's email and ordered by driver's name
        const q = query(recordsCollection, where("gestor", "==", user.email), orderBy('motorista', 'asc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const recordsData: DailyRecord[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                recordsData.push({
                    id: doc.id,
                    ...data,
                    // Convert Firestore Timestamp to JS Date
                    data: data.data.toDate(),
                } as DailyRecord);
            });
            setRecords(recordsData);
            setFilteredRecords(recordsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching documents: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filteredData = records.filter(item =>
            item.motorista.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredRecords(filteredData);
    }, [searchTerm, records]);
    
    const handleAddDriver = async () => {
        if (!user || !user.email) return;

        try {
            await addDoc(collection(db, 'daily_records'), {
                motorista: 'Novo Motorista',
                gestor: user.email,
                data: serverTimestamp(),
                status: 'JORNADA',
                statusViagem: '',
                horaExtra: '',
                justificativaAlteracaoStatus: '',
                justificativaStatusViagem: '',
                justificativaHoraExtra: '',
            });
        } catch (error) {
            console.error("Error adding new driver: ", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Header user={user} onLogout={logout} />

                <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <div className="p-4 sm:p-6 border-b dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:w-auto">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                           <input
                                type="text"
                                placeholder="Buscar motorista..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={handleAddDriver}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
                        >
                            <PlusCircle className="h-5 w-5" />
                            <span>Adicionar Motorista</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Motorista</th>
                                    <th scope="col" className="px-6 py-3">Status Geral</th>
                                    <th scope="col" className="px-6 py-3">Status Viagem</th>
                                    <th scope="col" className="px-6 py-3">Hora Extra</th>
                                    <th scope="col" className="px-6 py-3">Justificativas</th>
                                    <th scope="col" className="px-6 py-3">
                                        <span className="sr-only">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                            <p className="mt-2">Carregando registros...</p>
                                        </td>
                                    </tr>
                                ) : filteredRecords.length > 0 ? (
                                    filteredRecords.map(record => (
                                        <DriverRow key={record.id} record={record} />
                                    ))
                                ) : (
                                     <tr>
                                        <td colSpan={6} className="text-center py-8">
                                            <p>Nenhum registro encontrado.</p>
                                            <p className="text-xs text-slate-400">Tente ajustar sua busca ou adicione um novo motorista.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
