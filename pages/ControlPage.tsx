import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { DailyRecord, Gestor, Motorista } from '../types';
import { DriverRow } from '../components/DriverRow';
import { Search, PlusCircle } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let recordsQuery;
      const recordsCollection = collection(db, 'dailyRecords');

      if (isAdmin) {
        recordsQuery = query(recordsCollection);
      } else if (gestorProfile) {
        recordsQuery = query(recordsCollection, where('gestor', '==', gestorProfile.nome));
      } else {
        setRecords([]);
        setFilteredRecords([]);
        setLoading(false);
        return;
      }
      
      const querySnapshot = await getDocs(recordsQuery);
      const recordsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      }).sort((a, b) => b.data.getTime() - a.data.getTime());
      setRecords(recordsList);
      setFilteredRecords(recordsList);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
  
  useEffect(() => {
    const filtered = records.filter(record =>
      record.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.placas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const handleUpdate = async (id: string, field: keyof DailyRecord, value: any) => {
    try {
      const recordRef = doc(db, 'dailyRecords', id);
      await updateDoc(recordRef, { [field]: value });
      // Optimistic update
      setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    } catch (error) {
      console.error("Error updating record:", error);
      // fetchRecords(); // or show error
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
        try {
            await deleteDoc(doc(db, "dailyRecords", id));
            setRecords(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting record:", error);
        }
    }
  };

  const handleAddTodaysRecords = async () => {
    if (!gestorProfile && !isAdmin) {
        alert("Apenas gestores e administradores podem adicionar registros.");
        return;
    }

    setLoading(true);

    let driversToProcess: {nome: string, gestor: string}[] = [];
    if(isAdmin) {
        const querySnapshot = await getDocs(collection(db, 'motoristas'));
        driversToProcess = querySnapshot.docs.map(d => ({ nome: d.data().nome, gestor: d.data().gestor }));
    } else if (gestorProfile) {
        driversToProcess = gestorProfile.motoristas.map(m => ({nome: m, gestor: gestorProfile.nome}));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(collection(db, 'dailyRecords'), where('data', '>=', Timestamp.fromDate(today)));
    const todaysRecordsSnapshot = await getDocs(q);
    const existingDrivers = todaysRecordsSnapshot.docs.map(d => d.data().motorista);

    const newRecords = driversToProcess
        .filter(d => !existingDrivers.includes(d.nome))
        .map(d => ({
            motorista: d.nome,
            gestor: d.gestor,
            data: serverTimestamp(),
            placas: '',
            status: 'JORNADA',
            statusViagem: '',
            horaExtra: 'NÃO AUTORIZADO',
            diasEmJornada: '',
            justificativaJornada: '',
        }));

    if (newRecords.length === 0) {
        alert("Todos os registros do dia já foram criados.");
        setLoading(false);
        return;
    }
    
    try {
        await Promise.all(newRecords.map(rec => addDoc(collection(db, 'dailyRecords'), rec)));
        fetchRecords(); // Refresh data
    } catch (error) {
        console.error("Error adding today's records: ", error);
        setLoading(false);
    }
  };


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por motorista, placa, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full sm:w-80 p-2 pl-10 text-sm text-slate-900 border border-slate-300 rounded-lg bg-slate-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          />
        </div>
        
        { (isAdmin || gestorProfile) &&
          <button
              onClick={handleAddTodaysRecords}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 w-full sm:w-auto justify-center"
              disabled={loading}
          >
              <PlusCircle className="h-5 w-5" />
              <span>{loading ? 'Processando...' : 'Adicionar Registros do Dia'}</span>
          </button>
        }
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        {loading ? (
            <div className="text-center p-8">Carregando registros...</div>
        ) : (
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
                <th scope="col" className="px-3 py-3">Justificativa</th>
                <th scope="col" className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <DriverRow
                  key={record.id}
                  record={record}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
