import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { STATUS_OPCOES } from '../constants';
import { Search, UserPlus } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [allGestores, setAllGestores] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [gestorFilter, setGestorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      let recordsQuery = query(
        collection(db, 'registros'),
        where('data', '>=', Timestamp.fromDate(startOfDay)),
        where('data', '<=', Timestamp.fromDate(endOfDay))
      );

      if (!isAdmin && gestorProfile) {
        recordsQuery = query(recordsQuery, where('gestor', '==', gestorProfile.nome));
      }
      
      const querySnapshot = await getDocs(recordsQuery);
      const recordsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });
      setDailyRecords(recordsList.sort((a, b) => a.motorista.localeCompare(b.motorista)));

      if (isAdmin) {
          const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
          const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
          setAllGestores(gestoresList);
      }

    } catch (error) => {
      console.error("Error fetching daily records:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile]);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);
  
  const handleUpdateRecord = async (id: string, field: keyof DailyRecord, value: any) => {
    const recordRef = doc(db, 'registros', id);
    try {
      await updateDoc(recordRef, { 
        [field]: value,
        lastModifiedBy: gestorProfile?.nome || 'admin'
      });
      setDailyRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    } catch (error) {
      console.error("Error updating record:", error);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
      try {
        await deleteDoc(doc(db, 'registros', id));
        setDailyRecords(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error("Error deleting record:", error);
      }
    }
  };
  
  const handleCreateMissingRecords = async () => {
    if (!isAdmin && !gestorProfile) {
      alert('Apenas gestores e administradores podem realizar esta ação.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Get all active drivers
      let driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
      if (!isAdmin && gestorProfile) {
          driversQuery = query(driversQuery, where('gestor', '==', gestorProfile.nome));
      }
      const driversSnapshot = await getDocs(driversQuery);
      const allActiveDrivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      
      // 2. Get existing records for the day
      const existingDriverNames = new Set(dailyRecords.map(r => r.motorista));
      
      // 3. Find missing drivers
      const missingDrivers = allActiveDrivers.filter(d => !existingDriverNames.has(d.nome));
      
      if (missingDrivers.length === 0) {
        alert('Todos os motoristas ativos já possuem registro para a data selecionada.');
        setLoading(false);
        return;
      }
      
      // 4. Create new records in a batch
      const batch = writeBatch(db);
      const recordDate = new Date(selectedDate.toISOString().split('T')[0] + 'T12:00:00.000Z');
      
      missingDrivers.forEach(driver => {
        const newRecordRef = doc(collection(db, 'registros'));
        const newRecord: Omit<DailyRecord, 'id'> = {
          motorista: driver.nome,
          data: recordDate,
          gestor: driver.gestor,
          status: '',
          statusViagem: '',
          horaExtra: '',
        };
        batch.set(newRecordRef, newRecord);
      });
      
      await batch.commit();
      alert(`${missingDrivers.length} registros foram criados para os motoristas faltantes.`);
      fetchData(selectedDate); // Refresh data
      
    } catch (err) {
      console.error("Error creating missing records: ", err);
      alert('Ocorreu um erro ao gerar os registros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return dailyRecords.filter(record => {
      const matchesSearch = record.motorista.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGestor = !gestorFilter || record.gestor === gestorFilter;
      const matchesStatus = !statusFilter || record.status === statusFilter;
      return matchesSearch && matchesGestor && matchesStatus;
    });
  }, [dailyRecords, searchTerm, gestorFilter, statusFilter]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Input type="date" value is treated as UTC midnight.
    const date = new Date(e.target.value + 'T00:00:00Z');
    setSelectedDate(date);
  };

  return (
    <div>
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Date Picker */}
          <div className="lg:col-span-1">
            <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
            <input 
              type="date"
              id="date-picker"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="w-full input-style"
            />
          </div>
          
          {/* Search Input */}
          <div className="lg:col-span-1">
             <label htmlFor="search" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motorista</label>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                    type="text"
                    id="search"
                    placeholder="Buscar motorista..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full input-style pl-10"
                />
            </div>
          </div>

          {/* Gestor Filter (Admin only) */}
          {isAdmin && (
             <div className="lg:col-span-1">
                <label htmlFor="gestor-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gestor</label>
                <select 
                    id="gestor-filter"
                    value={gestorFilter}
                    onChange={e => setGestorFilter(e.target.value)}
                    className="w-full input-style"
                >
                    <option value="">Todos</option>
                    {allGestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
                </select>
            </div>
          )}

          {/* Status Filter */}
           <div className="lg:col-span-1">
                <label htmlFor="status-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select 
                    id="status-filter"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full input-style"
                >
                    <option value="">Todos</option>
                    {STATUS_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
          
          {/* Action Button */}
          <div className={`sm:col-span-2 lg:col-span-1 ${!isAdmin ? 'lg:col-start-5' : ''}`}>
            <button
              onClick={handleCreateMissingRecords}
              disabled={loading}
              className="w-full btn-secondary"
              title="Cria registros para motoristas ativos que ainda não tem um na data selecionada"
            >
              <UserPlus className="h-5 w-5" />
              <span>Gerar Faltantes</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8">Carregando registros...</div>
      ) : (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400">
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
                  <td colSpan={8} className="text-center p-8 text-slate-500 dark:text-slate-400">
                    Nenhum registro encontrado para os filtros selecionados.
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
