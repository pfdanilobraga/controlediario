import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  deleteDoc,
} from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Initialize with today's date at UTC midnight
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  });
  const { user } = useAuth(); // for lastModifiedBy

  const fetchAndCreateRecords = useCallback(async () => {
    if (!gestorProfile) {
      setError("Perfil de gestor não encontrado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const targetDateStart = Timestamp.fromDate(selectedDate);
      const targetDateEnd = new Date(selectedDate);
      targetDateEnd.setUTCDate(targetDateEnd.getUTCDate() + 1);
      const targetDateEndTimestamp = Timestamp.fromDate(targetDateEnd);
      
      // 1. Fetch all active drivers for the current scope (admin or gestor)
      let driversQuery;
      if (isAdmin) {
        driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
      } else {
        driversQuery = query(
          collection(db, 'motoristas'),
          where('gestor', '==', gestorProfile.nome),
          where('statusEmprego', '==', 'ATIVO')
        );
      }
      const driversSnapshot = await getDocs(driversQuery);
      const activeDrivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      const activeDriverNames = activeDrivers.map(d => d.nome);
      
      if (activeDriverNames.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Helper function to query records in chunks
      const queryRecordsByDrivers = async (driverNames: string[]) => {
        if (driverNames.length === 0) return [];
        const chunkSize = 30; // Firestore 'in' query limit
        const promises = [];
        for (let i = 0; i < driverNames.length; i += chunkSize) {
            const chunk = driverNames.slice(i, i + chunkSize);
            const recordsQuery = query(
                collection(db, 'registros'),
                where('data', '>=', targetDateStart),
                where('data', '<', targetDateEndTimestamp),
                where('motorista', 'in', chunk)
            );
            promises.push(getDocs(recordsQuery));
        }
        const snapshots = await Promise.all(promises);
        return snapshots.flatMap(snapshot => 
            snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    data: (data.data as Timestamp).toDate(),
                } as DailyRecord
            })
        );
      };

      // 2. Fetch existing records for these drivers for the selected date
      const existingRecordsData = await queryRecordsByDrivers(activeDriverNames);
      const existingRecordDriverNames = new Set(existingRecordsData.map(r => r.motorista));

      // 3. Identify drivers missing a record for the day and create new ones
      const missingDrivers = activeDrivers.filter(d => !existingRecordDriverNames.has(d.nome));
      
      if (missingDrivers.length > 0) {
          const batch = writeBatch(db);
          missingDrivers.forEach(driver => {
              const newRecordRef = doc(collection(db, 'registros'));
              batch.set(newRecordRef, {
                  motorista: driver.nome,
                  gestor: driver.gestor,
                  data: targetDateStart,
                  status: 'JORNADA',
                  statusViagem: 'EM VIAGEM',
                  horaExtra: 'NÃO AUTORIZADO',
                  placas: '',
                  diasEmJornada: '',
                  justificativaJornada: '',
                  lastModifiedBy: user?.email || 'system',
              });
          });
          await batch.commit();
          // Re-fetch all records to get the newly created ones
          const allRecordsData = await queryRecordsByDrivers(activeDriverNames);
          setRecords(allRecordsData.sort((a, b) => a.motorista.localeCompare(b.motorista)));

      } else {
         setRecords(existingRecordsData.sort((a, b) => a.motorista.localeCompare(b.motorista)));
      }

    } catch (e) {
      console.error("Error fetching or creating records: ", e);
      setError("Falha ao carregar os dados. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile, selectedDate, user?.email]);

  useEffect(() => {
    fetchAndCreateRecords();
  }, [fetchAndCreateRecords]);

  const handleUpdateRecord = async (id: string, field: keyof DailyRecord, value: any) => {
    try {
      const recordRef = doc(db, 'registros', id);
      await updateDoc(recordRef, {
        [field]: value,
        lastModifiedBy: user?.email,
      });
      setRecords(prevRecords =>
        prevRecords.map(r => (r.id === id ? { ...r, [field]: value } : r))
      );
    } catch (error) {
      console.error("Error updating record:", error);
      alert("Falha ao atualizar o registro.");
    }
  };
  
  const handleDeleteRecord = async (id: string) => {
    if(!isAdmin) {
        alert("Apenas administradores podem excluir registros.");
        return;
    }
    if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
        try {
            await deleteDoc(doc(db, 'registros', id));
            setRecords(prevRecords => prevRecords.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting record:", error);
            alert("Falha ao excluir o registro.");
        }
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    return records.filter(record =>
      record.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.placas?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateString = e.target.value;
      const [year, month, day] = dateString.split('-').map(Number);
      // Create date in UTC to avoid timezone issues with date picker
      const dateInUTC = new Date(Date.UTC(year, month - 1, day));
      setSelectedDate(dateInUTC);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por motorista ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-4">
            <label htmlFor="date-picker" className="font-medium shrink-0">Data:</label>
            <input 
                id="date-picker"
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={handleDateChange}
                className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
      </div>

      {loading && <p className="text-center p-4">Carregando registros...</p>}
      {error && <p className="text-center p-4 text-red-500">{error}</p>}
      
      {!loading && !error && (
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
                  <td colSpan={8} className="text-center p-4">
                    Nenhum registro encontrado para a data e filtros selecionados.
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
