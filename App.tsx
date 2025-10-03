
import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import type { Driver } from './types';
import { DriverGeneralStatus, TripStatus, OvertimeStatus } from './types';
import { Search, PlusCircle } from 'lucide-react';

function App() {
  const { user, logout } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const driversCollection = collection(db, 'drivers');
    const q = query(driversCollection, orderBy('motorista'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const driverList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Safely convert Firestore Timestamp to JS Date
                data: (data.data as Timestamp)?.toDate() || new Date(),
            } as Driver;
        });
        setDrivers(driverList);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching drivers:", err);
        setError('Falha ao carregar os dados dos motoristas.');
        setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleUpdateDriver = async (updatedDriver: Driver) => {
    try {
      const driverRef = doc(db, 'drivers', updatedDriver.id);
      const { id, ...dataToUpdate } = updatedDriver;
      await updateDoc(driverRef, dataToUpdate);
    } catch (err) {
      console.error("Error updating driver:", err);
      setError('Falha ao atualizar o motorista.');
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este motorista?')) {
        try {
            await deleteDoc(doc(db, 'drivers', driverId));
        } catch (err) {
            console.error("Error deleting driver:", err);
            setError('Falha ao excluir o motorista.');
        }
    }
  };

  const handleAddDriver = async () => {
      const motorista = window.prompt("Nome do novo motorista:");
      const gestor = window.prompt("Nome do gestor:");
      if (motorista && gestor) {
          try {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Set to midnight to represent the calendar day

              const newDriverData = {
                  motorista,
                  gestor,
                  data: today, // Store as a Date object, Firestore will convert to Timestamp
                  status: DriverGeneralStatus.JORNADA,
                  alteracaoStatus: DriverGeneralStatus.JORNADA,
                  justificativaAlteracaoStatus: '',
                  statusViagem: TripStatus.EM_VIAGEM,
                  justificativaStatusViagem: '',
                  horaExtra: OvertimeStatus.NAO_AUTORIZADO,
                  justificativaHoraExtra: '',
              };
              await addDoc(collection(db, 'drivers'), newDriverData);
          } catch (err) {
              console.error("Error adding driver:", err);
              setError('Falha ao adicionar novo motorista.');
          }
      }
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
              <button
                  onClick={handleAddDriver}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
              >
                  <PlusCircle size={18} />
                  <span>Adicionar Motorista</span>
              </button>
          </div>

          {loading && <p className="text-center text-slate-500 dark:text-slate-400">Carregando motoristas...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">Motorista</th>
                    <th scope="col" className="px-6 py-3">Gestor</th>
                    <th scope="col" className="px-6 py-3">Data</th>
                    <th scope="col" className="px-6 py-3">Status Geral</th>
                    <th scope="col" className="px-6 py-3">Alteração de Status</th>
                    <th scope="col" className="px-6 py-3">Status da Viagem</th>
                    <th scope="col" className="px-6 py-3">Hora Extra</th>
                    <th scope="col" className="px-6 py-3 text-center">Salvo</th>
                    <th scope="col" className="px-6 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <DriverRow
                      key={driver.id}
                      driver={driver}
                      onUpdate={handleUpdateDriver}
                      onDelete={handleDeleteDriver}
                    />
                  ))}
                </tbody>
              </table>
              {filteredDrivers.length === 0 && (
                 <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Lista de motoristas vazia</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Comece adicionando seu primeiro motorista usando os campos acima.</p>
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