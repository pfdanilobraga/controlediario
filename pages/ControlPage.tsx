import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { useAuth } from '../hooks/useAuth';
import { Search, UserPlus } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGestor, setSelectedGestor] = useState('');
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch managers
      if (isAdmin) {
        const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
        const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
        setGestores(gestoresList);
      }

      // Fetch daily records for today
      const recordsRef = collection(db, 'daily_records');
      const startOfDay = Timestamp.fromDate(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfDay = Timestamp.fromDate(tomorrow);

      let q = query(recordsRef, where('data', '>=', startOfDay), where('data', '<', endOfDay));
      
      if (!isAdmin && gestorProfile) {
        q = query(q, where('gestor', '==', gestorProfile.nome));
      }
      
      const querySnapshot = await getDocs(q);
      const recordsList: DailyRecord[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });

      setRecords(recordsList.sort((a, b) => a.motorista.localeCompare(b.motorista)));

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Falha ao carregar os dados. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }, [today, isAdmin, gestorProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateRecord = async (id: string, field: keyof DailyRecord, value: any) => {
    // Optimistic update
    setRecords(prevRecords =>
      prevRecords.map(record =>
        record.id === id ? { ...record, [field]: value, lastModifiedBy: user?.email } : record
      )
    );

    try {
      const recordRef = doc(db, 'daily_records', id);
      await updateDoc(recordRef, {
        [field]: value,
        lastModifiedBy: user?.email,
        lastModifiedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating record:", error);
      setError("Falha ao salvar a alteração. A página será recarregada.");
      // Revert optimistic update on error
      fetchData(); 
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Tem certeza que deseja excluir este registro diário?")) {
      try {
        await deleteDoc(doc(db, 'daily_records', id));
        setRecords(prev => prev.filter(rec => rec.id !== id));
      } catch (error) {
        console.error("Error deleting record:", error);
        setError("Falha ao excluir o registro.");
      }
    }
  };

  const generateDailyRecords = async () => {
    if (!isAdmin) return;
    setIsGenerating(true);
    setError(null);
    try {
      // 1. Get all active drivers
      const driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
      const driversSnapshot = await getDocs(driversQuery);
      const activeDrivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      
      // 2. Get existing records for today
      const startOfDay = Timestamp.fromDate(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfDay = Timestamp.fromDate(tomorrow);
      const recordsQuery = query(collection(db, 'daily_records'), where('data', '>=', startOfDay), where('data', '<', endOfDay));
      const existingRecordsSnapshot = await getDocs(recordsQuery);
      const existingDriverNames = new Set(existingRecordsSnapshot.docs.map(doc => doc.data().motorista));

      // 3. Filter out drivers who already have a record
      const driversToCreate = activeDrivers.filter(driver => !existingDriverNames.has(driver.nome));

      if (driversToCreate.length === 0) {
        alert("Todos os motoristas ativos já possuem registro para hoje.");
        setIsGenerating(false);
        return;
      }

      // 4. Create new records in a batch
      const batch = writeBatch(db);
      driversToCreate.forEach(driver => {
        const newRecordRef = doc(collection(db, 'daily_records'));
        const newRecordData = {
          motorista: driver.nome,
          data: Timestamp.fromDate(today),
          gestor: driver.gestor,
          placas: '',
          status: '',
          alteracaoStatus: '',
          justificativaAlteracaoStatus: '',
          statusViagem: '',
          justificativaStatusViagem: '',
          horaExtra: '',
          justificativaHoraExtra: '',
          diasEmJornada: '',
          justificativaJornada: '',
          alocado: '',
          lastModifiedBy: user?.email,
        };
        batch.set(newRecordRef, newRecordData);
      });
      
      await batch.commit();
      alert(`${driversToCreate.length} novos registros diários foram criados.`);
      fetchData(); // Refresh data

    } catch (err) {
      console.error("Error generating daily records:", err);
      setError("Ocorreu um erro ao gerar os registros diários.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter(record =>
        record.motorista.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(record =>
        isAdmin ? (selectedGestor ? record.gestor === selectedGestor : true) : true
      );
  }, [records, searchTerm, isAdmin, selectedGestor]);

  if (loading) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-700 dark:text-slate-300">Carregando registros diários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 col-span-full lg:col-span-1">
                Controle para {today.toLocaleDateString('pt-BR')}
            </h2>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700"
                />
            </div>

            {isAdmin && (
                <div className="flex items-center gap-4">
                    <select
                        value={selectedGestor}
                        onChange={(e) => setSelectedGestor(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700"
                    >
                        <option value="">Todos os Gestores</option>
                        {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
                    </select>
                </div>
            )}
        </div>
        {isAdmin && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                    onClick={generateDailyRecords}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                >
                    <UserPlus className="h-5 w-5" />
                    <span>{isGenerating ? 'Gerando...' : 'Gerar Registros do Dia'}</span>
                </button>
            </div>
        )}
      </div>

      {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900 p-3 rounded-md">{error}</p>}
      
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>Motorista</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Placas</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>Status</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>Status Viagem</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>Hora Extra</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Dias em Jornada</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>Justificativa Jornada</th>
              <th scope="col" className="px-3 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map(record => (
                <DriverRow
                  key={record.id}
                  record={record}
                  onUpdate={handleUpdateRecord}
                  onDelete={handleDeleteRecord}
                  isAdmin={isAdmin}
                />
              ))
            ) : (
                <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        {records.length === 0 && !isAdmin ? 'Nenhum registro encontrado para hoje. Contate o administrador.' : 'Nenhum registro correspondente aos filtros.'}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
