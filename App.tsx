

import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, addDoc, Timestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import type { Driver } from './types';
import { DriverGeneralStatus, TripStatus, OvertimeStatus } from './types';
import { Search, PlusCircle, Save } from 'lucide-react';

// Helper to get date at midnight in UTC for consistent querying
const getStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

function App() {
  const { user, logout } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    setLoading(true);
    setError(null);

    const startOfDay = getStartOfDay(selectedDate);
    
    // Firestore query for records on the selected date
    const recordsCollection = collection(db, 'daily_records');
    const q = query(recordsCollection, where("data", "==", Timestamp.fromDate(startOfDay)), orderBy('motorista'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const driverList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                data: (data.data as Timestamp)?.toDate() || new Date(),
            } as Driver;
        });
        setDrivers(driverList);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching daily records:", err);
        setError('Falha ao carregar os dados dos motoristas para esta data.');
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]); // Re-run effect when selectedDate changes

  // This will be used in the next step with the "Save All" button
  const handleLocalUpdate = (updatedDriver: Driver) => {
    setDrivers(prevDrivers => 
        prevDrivers.map(d => d.id === updatedDriver.id ? updatedDriver : d)
    );
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro diário do motorista?')) {
        try {
            // Note: This deletes the daily record, not the driver themselves.
            await deleteDoc(doc(db, 'daily_records', driverId));
        } catch (err) {
            console.error("Error deleting record:", err);
            setError('Falha ao excluir o registro.');
        }
    }
  };

  const handleAddDriver = async () => {
      const motorista = window.prompt("Nome do novo motorista:");
      const gestor = window.prompt("Nome do gestor:");
      if (motorista && gestor) {
          try {
              const startOfDay = getStartOfDay(selectedDate);
              const newDriverData = {
                  motorista,
                  gestor,
                  data: Timestamp.fromDate(startOfDay),
                  status: DriverGeneralStatus.JORNADA,
                  alteracaoStatus: DriverGeneralStatus.JORNADA,
                  justificativaAlteracaoStatus: '',
                  statusViagem: TripStatus.EM_VIAGEM,
                  justificativaStatusViagem: '',
                  horaExtra: OvertimeStatus.NAO_AUTORIZADO,
                  justificativaHoraExtra: '',
              };
              await addDoc(collection(db, 'daily_records'), newDriverData);
          } catch (err) {
              console.error("Error adding driver record:", err);
              setError('Falha ao adicionar novo registro de motorista.');
          }
      }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      // Adjust for timezone offset to get the correct calendar day
      const timezoneOffset = date.getTimezoneOffset() * 60000;
      setSelectedDate(new Date(date.getTime() + timezoneOffset));
  };
  
  const filteredDrivers = drivers.filter(driver =>
    driver.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.gestor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Header user={user} onLogout={logout} />

        <main className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por motorista ou gestor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                    />
                </div>
                <div>
                    <input 
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                    />
                </div>
              </div>
              <button
                  onClick={handleAddDriver}
                  className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
              >
                  <PlusCircle size={18} />
                  <span>Adicionar Registro</span>
              </button>
          </div>

          {loading && <p className="text-center text-slate-500 dark:text-slate-400">Carregando registros para {selectedDate.toLocaleDateString('pt-BR')}...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">Motorista</th>
                    <th scope="col" className="px-6 py-3">Gestor</th>
                    <th scope="col" className="px-6 py-3">Status Geral</th>
                    <th scope="col" className="px-6 py-3">Alteração de Status</th>
                    <th scope="col" className="px-6 py-3">Status da Viagem</th>
                    <th scope="col" className="px-6 py-3">Hora Extra</th>
                    <th scope="col" className="px-6 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <DriverRow
                      key={driver.id}
                      driver={driver}
                      onUpdate={handleLocalUpdate} // Temporarily updates local state
                      onDelete={handleDeleteDriver}
                    />
                  ))}
                </tbody>
              </table>
              {filteredDrivers.length === 0 && (
                 <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Nenhum registro encontrado</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Não há registros para a data selecionada. Adicione um novo registro para começar.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
