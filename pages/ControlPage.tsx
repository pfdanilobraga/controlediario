import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DriverRow } from '../components/DriverRow';
import { Search } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGestor, setSelectedGestor] = useState<string>('');
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async (targetDate: Date) => {
    setLoading(true);
    try {
      const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
      const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
      setGestores(gestoresList);

      let driversQuery;
      if (isAdmin) {
        driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
      } else if (gestorProfile) {
        driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'), where('gestor', '==', gestorProfile.nome));
      } else {
        setRecords([]);
        setLoading(false);
        return;
      }
      
      const driversSnapshot = await getDocs(driversQuery);
      const driversList = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));

      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const recordsQuery = query(
        collection(db, 'dailyRecords'),
        where('data', '>=', Timestamp.fromDate(startOfDay)),
        where('data', '<=', Timestamp.fromDate(endOfDay))
      );
      const recordsSnapshot = await getDocs(recordsQuery);
      const existingRecords = recordsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });

      const driverNamesWithRecords = new Set(existingRecords.map(r => r.motorista));

      const newRecordsForDisplay: DailyRecord[] = driversList
        .filter(driver => !driverNamesWithRecords.has(driver.nome))
        .map(driver => ({
          id: `new-${driver.nome}`,
          motorista: driver.nome,
          data: startOfDay,
          gestor: driver.gestor,
          status: 'JORNADA',
          statusViagem: 'EM VIAGEM',
          horaExtra: 'NÃO AUTORIZADO',
        }));
      
      const allRecordsForDay = [...existingRecords, ...newRecordsForDisplay].sort((a, b) => a.motorista.localeCompare(b.motorista));
      
      setRecords(allRecordsForDay);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile]);

  useEffect(() => {
    const targetDate = new Date(date);
    const userTimezoneOffset = targetDate.getTimezoneOffset() * 60000;
    fetchData(new Date(targetDate.getTime() + userTimezoneOffset));
  }, [date, fetchData]);

  const handleUpdateRecord = async (id: string, field: keyof DailyRecord, value: any) => {
    const optimisticUpdate = records.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    );
    setRecords(optimisticUpdate);

    const recordToUpdate = optimisticUpdate.find(r => r.id === id);
    if (!recordToUpdate) return;

    try {
      if (id.startsWith('new-')) {
         const { id: tempId, ...newRecordData } = recordToUpdate;
         const docRef = await addDoc(collection(db, 'dailyRecords'), {
             ...newRecordData,
             lastModifiedBy: user?.email || 'unknown'
         });
         const finalUpdate = records.map(r => r.id === id ? {...r, id: docRef.id} : r);
         setRecords(finalUpdate);
      } else {
        const recordRef = doc(db, 'dailyRecords', id);
        await updateDoc(recordRef, {
          [field]: value,
          lastModifiedBy: user?.email || 'unknown'
        });
      }
    } catch (error) {
      console.error("Error updating record:", error);
      setRecords(records);
      alert("Falha ao atualizar o registro.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
      if (id.startsWith('new-')) {
          alert("Este registro ainda não foi salvo e não pode ser excluído.");
          return;
      }
      if (window.confirm("Tem certeza que deseja excluir este registro diário?")) {
          try {
              await deleteDoc(doc(db, 'dailyRecords', id));
              setRecords(records.filter(r => r.id !== id));
          } catch(err) {
              console.error("Error deleting record: ", err);
              alert("Falha ao excluir o registro.");
          }
      }
  }

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = record.motorista.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGestor = !selectedGestor || record.gestor === selectedGestor;
      return matchesSearch && matchesGestor;
    });
  }, [records, searchTerm, selectedGestor]);

  return (
    <div>
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Controle</label>
            <input
              type="date"
              id="date-picker"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full input-style"
            />
          </div>

          <div className="relative">
             <label htmlFor="search-driver" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar Motorista</label>
            <input
              type="text"
              id="search-driver"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full input-style pl-10"
            />
            <Search className="absolute left-3 top-9 h-5 w-5 text-slate-400" />
          </div>

          {isAdmin && (
            <div>
              <label htmlFor="gestor-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar por Gestor</label>
              <select
                id="gestor-filter"
                value={selectedGestor}
                onChange={(e) => setSelectedGestor(e.target.value)}
                className="w-full input-style"
              >
                <option value="">Todos os Gestores</option>
                {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-3 py-3 sticky left-0 bg-slate-50 dark:bg-slate-700 z-10" style={{minWidth: '250px'}}>Motorista</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '150px'}}>Placas</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '180px'}}>Status</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '180px'}}>Status Viagem</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '180px'}}>Hora Extra</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '150px'}}>Dias em Jornada</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '250px'}}>Justificativa Jornada > 7 Dias</th>
              <th scope="col" className="px-3 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center p-8">Carregando dados...</td></tr>
            ) : filteredRecords.length > 0 ? (
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
              <tr><td colSpan={8} className="text-center p-8">Nenhum registro encontrado para a data e filtros selecionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
