import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, writeBatch, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './hooks/useAuth';
import { DailyRecord } from './types';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import { Search, Save } from 'lucide-react';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const fetchRecordsForDate = useCallback(async (date: Date) => {
    setLoading(true);
    setDirtyRecords(new Map()); // Clear pending changes when date changes
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const recordsRef = collection(db, "daily_records");
      const q = query(
        recordsRef,
        where("data", ">=", Timestamp.fromDate(startOfDay)),
        where("data", "<=", Timestamp.fromDate(endOfDay)),
        orderBy("data"),
        orderBy("motorista")
      );
      
      const data = await getDocs(q);
      const fetchedRecords = data.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        // Ensure data is a JS Date object for easier handling
        data: (doc.data().data as Timestamp).toDate(),
      })) as DailyRecord[];
      
      setRecords(fetchedRecords);
    } catch (error) {
      console.error("Error fetching records for date: ", error);
      alert("Falha ao carregar os dados. Verifique se o índice do Firestore foi criado corretamente (em daily_records: data ASC, motorista ASC).");
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecordsForDate(selectedDate);
    }
  }, [user, selectedDate, fetchRecordsForDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value + 'T00:00:00'); // Adjust for timezone offset
    setSelectedDate(date);
  };

  const handleRecordUpdate = (updatedRecord: DailyRecord) => {
    // Update local state for immediate UI feedback
    setRecords(prevRecords =>
      prevRecords.map(record =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
    // Track changes to be saved
    setDirtyRecords(prev => new Map(prev).set(updatedRecord.id, updatedRecord));
  };
  
  const handleSaveChanges = async () => {
    if (dirtyRecords.size === 0 || isSaving) return;
    setIsSaving(true);
    
    const batch = writeBatch(db);
    dirtyRecords.forEach((record, id) => {
      const docRef = doc(db, "daily_records", id);
      const { id: recordId, ...dataToSave } = record; // Exclude client-side id from Firestore doc
      batch.update(docRef, dataToSave);
    });

    try {
      await batch.commit();
      setDirtyRecords(new Map()); // Clear changes after successful save
    } catch (error) {
      console.error("Error saving changes: ", error);
      alert("Ocorreu um erro ao salvar as alterações.");
    }
    setIsSaving(false);
  };
  
  const filteredRecords = records.filter(record =>
    record.motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.gestor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.placas?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const dateToInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Header user={user} onLogout={logout} />

        <main className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <input
                    type="date"
                    value={dateToInputValue(selectedDate)}
                    onChange={handleDateChange}
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                />
                 <div className="relative w-full md:w-auto flex-grow">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                  />
                </div>
            </div>
            <button
                onClick={handleSaveChanges}
                disabled={dirtyRecords.size === 0 || isSaving}
                className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                <span>{isSaving ? 'Salvando...' : `Salvar Alterações (${dirtyRecords.size})`}</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-700 z-10">Motorista</th>
                  <th scope="col" className="px-4 py-3">Gestor</th>
                  <th scope="col" className="px-4 py-3">Placas</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Alteração Status</th>
                  <th scope="col" className="px-4 py-3 min-w-[250px]">Justificativa Alteração Status</th>
                  <th scope="col" className="px-4 py-3">Status Viagem</th>
                  <th scope="col" className="px-4 py-3 min-w-[250px]">Justificativa Status Viagem</th>
                  <th scope="col" className="px-4 py-3">Hora Extra</th>
                  <th scope="col" className="px-4 py-3 min-w-[250px]">Justificativa Hora Extra</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center p-6 text-lg">Carregando registros...</td></tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map(record => (
                    <DriverRow
                      key={record.id}
                      record={record}
                      onUpdate={handleRecordUpdate}
                    />
                  ))
                ) : (
                  <tr><td colSpan={10} className="text-center p-6 text-lg">{searchTerm ? `Nenhum registro encontrado para "${searchTerm}".` : 'Nenhum registro para esta data.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
