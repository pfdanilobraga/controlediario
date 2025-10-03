import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './hooks/useAuth';
import { Driver, DriverGeneralStatus, TripStatus, OvertimeStatus } from './types';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import { PlusCircle, Search } from 'lucide-react';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDriverName, setNewDriverName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const driversCollectionRef = collection(db, "drivers");

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(driversCollectionRef, orderBy("createdAt", "desc"));
      const data = await getDocs(q);
      const fetchedDrivers = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Driver[];
      setDrivers(fetchedDrivers);
    } catch (error) {
      console.error("Error fetching drivers: ", error);
    }
    setLoading(false);
  }, []); // driversCollectionRef is stable

  useEffect(() => {
    if (user) {
      fetchDrivers();
    }
  }, [user, fetchDrivers]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDriverName.trim() === '' || isAdding) return;
    setIsAdding(true);
    try {
      await addDoc(driversCollectionRef, {
        name: newDriverName.trim(),
        generalStatus: DriverGeneralStatus.Disponivel,
        tripStatus: TripStatus.NaoIniciada,
        overtime: OvertimeStatus.NaoSeAplica,
        notes: '',
        createdAt: serverTimestamp(),
      });
      fetchDrivers(); 
      setNewDriverName('');
    } catch (error) {
      console.error("Error adding driver: ", error);
    }
    setIsAdding(false);
  };

  const handleUpdateDriver = async (id: string, data: Partial<Omit<Driver, 'id' | 'createdAt' | 'name'>>) => {
    const driverDoc = doc(db, "drivers", id);
    try {
      await updateDoc(driverDoc, data);
      setDrivers(prevDrivers =>
        prevDrivers.map(driver => (driver.id === id ? { ...driver, ...data } : driver))
      );
    } catch (error) {
      console.error("Error updating driver: ", error);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este motorista? A ação não pode ser desfeita.")) {
      const driverDoc = doc(db, "drivers", id);
      try {
        await deleteDoc(driverDoc);
        setDrivers(prevDrivers => prevDrivers.filter(driver => driver.id !== id));
      } catch (error) {
        console.error("Error deleting driver: ", error);
      }
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Header user={user} onLogout={logout} />

        <main className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <form onSubmit={handleAddDriver} className="flex-grow sm:flex-grow-0 flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Nome do novo motorista"
                className="flex-grow bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                disabled={isAdding}
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800"
                disabled={isAdding || newDriverName.trim() === ''}
              >
                {isAdding ? 'Adicionando...' : <><PlusCircle className="h-5 w-5" /><span className="hidden sm:inline">Adicionar</span></>}
              </button>
            </form>
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome</th>
                  <th scope="col" className="px-6 py-3">Status Geral</th>
                  <th scope="col" className="px-6 py-3">Status Viagem</th>
                  <th scope="col" className="px-6 py-3">Horas Extras</th>
                  <th scope="col" className="px-6 py-3">Observações</th>
                  <th scope="col" className="px-6 py-3 min-w-[160px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-6 text-lg">Carregando motoristas...</td></tr>
                ) : filteredDrivers.length > 0 ? (
                  filteredDrivers.map(driver => (
                    <DriverRow
                      key={driver.id}
                      driver={driver}
                      onUpdate={handleUpdateDriver}
                      onDelete={handleDeleteDriver}
                    />
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center p-6 text-lg">{searchTerm ? `Nenhum motorista encontrado para "${searchTerm}".` : 'Nenhum motorista cadastrado.'}</td></tr>
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
