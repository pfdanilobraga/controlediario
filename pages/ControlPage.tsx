import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
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
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Local midnight
    return today;
  });
  const [searchTerm, setSearchTerm] = useState('');

  const formatDateForInput = (date: Date): string => {
    // Helper to get YYYY-MM-DD from a Date object, respecting local date
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchAndSyncRecords = useCallback(async (date: Date) => {
    if (!gestorProfile || !user) return;
    setLoading(true);

    try {
      // 1. Get all active drivers for the current manager or all if admin
      const motoristasRef = collection(db, 'motoristas');
      let motoristasQuery;
      if (isAdmin) {
        motoristasQuery = query(motoristasRef, where('statusEmprego', '==', 'ATIVO'));
      } else {
        motoristasQuery = query(
            motoristasRef,
            where('gestor', '==', gestorProfile.nome),
            where('statusEmprego', '==', 'ATIVO')
        );
      }
      
      const motoristasSnapshot = await getDocs(motoristasQuery);
      const activeDrivers = motoristasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));

      // 2. Get existing daily records for the selected date
      const startOfDay = Timestamp.fromDate(date);
      
      const recordsCollectionRef = collection(db, 'registrosDiarios');
      const recordsQuery = query(recordsCollectionRef, where('data', '==', startOfDay));
      
      const recordsSnapshot = await getDocs(recordsQuery);
      const existingRecordsMap = new Map<string, DailyRecord>();
      recordsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingRecordsMap.set(data.motorista, {
            id: doc.id,
            ...data,
            data: (data.data as Timestamp).toDate()
        } as DailyRecord)
      });
      
      // 3. Sync records: create missing ones
      const batch = writeBatch(db);
      const allRecordsForDay: DailyRecord[] = [];
      const dateId = formatDateForInput(date);

      for (const driver of activeDrivers) {
        let record = existingRecordsMap.get(driver.nome);
        if (!record) {
          const recordId = `${dateId}_${driver.nome.replace(/[^a-zA-Z0-9]/g, '-')}`;
          const newRecordData: Omit<DailyRecord, 'id'> = {
            motorista: driver.nome,
            data: date,
            gestor: driver.gestor,
            placas: '',
            status: 'JORNADA',
            statusViagem: '',
            horaExtra: '',
            diasEmJornada: '',
            justificativaJornada: '',
            lastModifiedBy: user.email,
          };
          const recordRef = doc(db, 'registrosDiarios', recordId);
          batch.set(recordRef, {
              ...newRecordData,
              data: Timestamp.fromDate(newRecordData.data)
          });
          allRecordsForDay.push({ ...newRecordData, id: recordId });
        } else {
          allRecordsForDay.push(record);
        }
      }

      await batch.commit();
      
      setDailyRecords(allRecordsForDay.sort((a,b) => a.motorista.localeCompare(b.motorista)));
    } catch (error) {
      console.error("Error fetching or syncing daily records:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile, user]);

  useEffect(() => {
    if (gestorProfile) {
        fetchAndSyncRecords(selectedDate);
    } else {
        setLoading(false);
    }
  }, [selectedDate, fetchAndSyncRecords, gestorProfile]);

  const handleUpdateRecord = async (id: string, field: keyof DailyRecord, value: any) => {
    if(!user) return;
    try {
        const recordRef = doc(db, 'registrosDiarios', id);
        await updateDoc(recordRef, {
            [field]: value,
            lastModifiedBy: user.email,
            lastModifiedAt: Timestamp.now(),
        });

        setDailyRecords(prevRecords =>
            prevRecords.map(rec =>
                rec.id === id ? { ...rec, [field]: value } : rec
            )
        );
    } catch (error) {
        console.error("Error updating record:", error);
        alert('Falha ao atualizar o registro.');
    }
  };
  
  const handleDeleteRecord = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este registro diário? Esta ação não pode ser desfeita.")) {
          try {
              await deleteDoc(doc(db, 'registrosDiarios', id));
              setDailyRecords(prev => prev.filter(rec => rec.id !== id));
          } catch (error) {
              console.error("Error deleting record:", error);
              alert("Falha ao excluir o registro.");
          }
      }
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm) {
      return dailyRecords;
    }
    return dailyRecords.filter(record =>
      record.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.placas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dailyRecords, searchTerm]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    setSelectedDate(newDate);
  };
  
  if (!gestorProfile) {
      return <div className="text-center p-8">Carregando perfil do usuário...</div>;
  }
  
  return (
    <div>
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Filtrar por motorista, placa ou status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full sm:w-80 p-2 pl-10 text-sm text-slate-900 border border-slate-300 rounded-lg bg-slate-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                />
            </div>
            <div className="w-full sm:w-auto">
                <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    onChange={handleDateChange}
                    className="block w-full p-2 text-sm text-slate-900 border border-slate-300 rounded-lg bg-slate-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                />
            </div>
        </div>

      {loading ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Sincronizando registros para {selectedDate.toLocaleDateString('pt-BR')}...</p>
      ) : (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>Motorista</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Placas</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>Status</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>Status Viagem</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>Hora Extra</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Dias em Jornada</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>Justificativa Jornada > 7 dias</th>
                <th scope="col" className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
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
                  <td colSpan={8} className="text-center py-4 text-slate-500 dark:text-slate-400">
                    Nenhum motorista ativo para este gestor ou nenhum registro para a data e filtro selecionados.
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
