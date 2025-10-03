import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { useAuth } from '../hooks/useAuth';
import { Search, Filter, UserPlus } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [selectedGestor, setSelectedGestor] = useState<string>('');

  const fetchRecords = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      
      const startTimestamp = Timestamp.fromDate(startOfDay);
      const endTimestamp = Timestamp.fromDate(endOfDay);
      
      let q = query(collection(db, 'registrosDiarios'), where('data', '>=', startTimestamp), where('data', '<=', endTimestamp));
      
      if (!isAdmin && gestorProfile) {
        q = query(q, where('gestor', '==', gestorProfile.nome));
      } else if (selectedGestor) {
        q = query(q, where('gestor', '==', selectedGestor));
      }

      const querySnapshot = await getDocs(q);
      const recordsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });
      setRecords(recordsList.sort((a,b) => a.motorista.localeCompare(b.motorista)));
    } catch (error) {
      console.error("Error fetching records: ", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile, selectedGestor]);

  const fetchGestores = useCallback(async () => {
    if (isAdmin) {
      try {
        const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
        const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
        setGestores(gestoresList);
      } catch (error) {
        console.error("Error fetching gestores: ", error);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchGestores();
  }, [fetchGestores]);

  useEffect(() => {
    fetchRecords(selectedDate);
  }, [selectedDate, fetchRecords]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    setSelectedDate(new Date(date.getTime() + userTimezoneOffset));
  };
  
  const handleUpdateRecord = async (id: string, field: keyof DailyRecord, value: any) => {
    const recordRef = doc(db, 'registrosDiarios', id);
    try {
      await updateDoc(recordRef, {
        [field]: value,
        lastModifiedBy: user?.email || 'unknown'
      });
      setRecords(prevRecords =>
        prevRecords.map(rec =>
          rec.id === id ? { ...rec, [field]: value } : rec
        )
      );
    } catch (error) {
      console.error("Error updating record:", error);
    }
  };

  const handleDeleteRecord = async (id: string) => {
     if (window.confirm('Tem certeza que deseja excluir este registro diário?')) {
        try {
            await deleteDoc(doc(db, 'registrosDiarios', id));
            setRecords(prevRecords => prevRecords.filter(rec => rec.id !== id));
        } catch (error) {
            console.error("Error deleting record: ", error);
            alert("Falha ao excluir o registro.");
        }
     }
  };

  const handleGenerateRecords = async () => {
    if (!window.confirm(`Gerar registros para ${selectedDate.toLocaleDateString('pt-BR')}? Isso pode sobrescrever dados existentes.`)) {
        return;
    }
    setLoading(true);
    try {
        const motoristasSnapshot = await getDocs(query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO')));
        const motoristasAtivos = motoristasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));

        const dateForRecord = new Date(selectedDate);
        dateForRecord.setUTCHours(12,0,0,0);
        const recordTimestamp = Timestamp.fromDate(dateForRecord);

        for (const motorista of motoristasAtivos) {
            const docId = `${dateForRecord.toISOString().split('T')[0]}_${motorista.id}`;
            const recordRef = doc(db, 'registrosDiarios', docId);
            const recordSnap = await getDoc(recordRef);

            if (!recordSnap.exists()) {
                 const newRecord: Omit<DailyRecord, 'id' | 'data'> = {
                    motorista: motorista.nome,
                    gestor: motorista.gestor,
                    status: 'JORNADA',
                    statusViagem: 'EM VIAGEM',
                    horaExtra: 'NÃO AUTORIZADO',
                    lastModifiedBy: user?.email,
                 };
                await setDoc(recordRef, {
                    ...newRecord,
                    data: recordTimestamp // Store as Timestamp
                });
            }
        }
        fetchRecords(selectedDate); // Refresh records
    } catch (error) {
        console.error("Error generating records: ", error);
        alert("Falha ao gerar registros.");
    } finally {
        setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(record =>
      record.motorista.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  return (
    <div>
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Controle</label>
                    <input
                        id="date-picker"
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="w-full input-style"
                    />
                </div>
                <div>
                     <label htmlFor="search" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pesquisar Motorista</label>
                    <div className="relative">
                        <input
                            id="search"
                            type="text"
                            placeholder="Nome do motorista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full input-style pl-10"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    </div>
                </div>

                {isAdmin && (
                    <div>
                         <label htmlFor="gestor-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar por Gestor</label>
                         <div className="relative">
                            <select
                                id="gestor-filter"
                                value={selectedGestor}
                                onChange={(e) => setSelectedGestor(e.target.value)}
                                className="w-full input-style pl-10"
                            >
                                <option value="">Todos os Gestores</option>
                                {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                )}
                {isAdmin && (
                    <button onClick={handleGenerateRecords} className="btn-secondary h-10">
                        <UserPlus className="h-5 w-5 mr-2" />
                        Gerar Registros do Dia
                    </button>
                )}
            </div>
        </div>
      
      {loading ? (
        <p className="text-center p-8">Carregando registros...</p>
      ) : (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0">
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
                    <td colSpan={8} className="text-center p-8 text-slate-500 dark:text-slate-400">
                        Nenhum registro encontrado para a data e filtros selecionados.
                        {isAdmin && <p className="text-sm mt-2">Você pode gerar os registros para hoje clicando no botão "Gerar Registros do Dia".</p>}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
