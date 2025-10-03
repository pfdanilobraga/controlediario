import React, { useState, useMemo, useEffect } from 'react';
import { Driver } from './types';
import { Header } from './components/Header';
import { DriverRow } from './components/DriverRow';
import { PlusCircle, Search } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverManager, setNewDriverManager] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "drivers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const driversData: Driver[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        driversData.push({ 
            ...data, 
            id: doc.id,
            data: (data.data as Timestamp).toDate().toISOString().split('T')[0],
         } as Driver);
      });
      setDrivers(driversData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const handleDriverUpdate = async (updatedDriver: Driver) => {
    const { id, ...driverData } = updatedDriver;
    if (id) {
        const driverRef = doc(db, "drivers", id);
        const dataToWrite = {
            ...driverData,
            data: new Date(driverData.data + 'T00:00:00'),
        };
        await updateDoc(driverRef, dataToWrite);
    }
  };

  const handleDriverDelete = async (driverId: string) => {
    if (window.confirm("Você tem certeza que deseja excluir este motorista? Esta ação não pode ser desfeita.")) {
      try {
        await deleteDoc(doc(db, "drivers", driverId));
      } catch (error) {
        console.error("Erro ao excluir motorista: ", error);
        alert("Ocorreu um erro ao tentar excluir o motorista. Por favor, tente novamente.");
      }
    }
  };

  const handleAddDriver = async () => {
    if (newDriverName.trim() === '' || newDriverManager.trim() === '') {
        alert('Por favor, preencha o nome do motorista e do gestor.');
        return;
    }
    const newDriver = {
        motorista: newDriverName.trim(),
        gestor: newDriverManager.trim(),
        data: new Date(),
        status: 'JORNADA',
        alteracaoStatus: 'JORNADA',
        justificativaAlteracaoStatus: '',
        statusViagem: 'EM VIAGEM',
        justificativaStatusViagem: '',
        horaExtra: 'NÃO AUTORIZADO',
        justificativaHoraExtra: '',
        createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "drivers"), newDriver);
    setNewDriverName('');
    setNewDriverManager('');
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver =>
      driver.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.gestor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drivers, searchTerm]);

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Header user={user} onLogout={logout} />

        <div className="mt-8 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar motorista ou gestor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div className="flex flex-col sm:flex-row md:col-span-2 gap-4">
              <input
                type="text"
                placeholder="Nome do novo motorista"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <input
                type="text"
                placeholder="Nome do gestor"
                value={newDriverManager}
                onChange={(e) => setNewDriverManager(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <button
                onClick={handleAddDriver}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
              >
                <PlusCircle className="h-5 w-5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3 min-w-[150px]">Motorista</th>
                  <th scope="col" className="px-6 py-3 min-w-[150px]">Gestor</th>
                  <th scope="col" className="px-6 py-3 min-w-[120px]">Data</th>
                  <th scope="col" className="px-6 py-3 min-w-[200px]">Status</th>
                  <th scope="col" className="px-6 py-3 min-w-[250px]">Alteração Status / Justificativa</th>
                  <th scope="col" className="px-6 py-3 min-w-[250px]">Status Viagem / Justificativa</th>
                  <th scope="col" className="px-6 py-3 min-w-[250px]">Hora Extra / Justificativa</th>
                  <th scope="col" className="px-6 py-3 min-w-[150px]">Status da Ação</th>
                  <th scope="col" className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                    <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-500 dark:text-slate-400">
                            Carregando motoristas...
                        </td>
                    </tr>
                ) : filteredDrivers.length > 0 ? (
                    filteredDrivers.map(driver => (
                        <DriverRow 
                            key={driver.id} 
                            driver={driver} 
                            onUpdate={handleDriverUpdate} 
                            onDelete={handleDriverDelete}
                        />
                    ))
                ) : (
                    <tr>
                       <td colSpan={9} className="text-center py-10 text-slate-500 dark:text-slate-400">
                            <p>Nenhum motorista encontrado.</p>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
