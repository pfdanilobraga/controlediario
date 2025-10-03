import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch, query, where, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { DailyRecord, Gestor, Motorista } from '../types';
import { DriverRow } from '../components/DriverRow';
import { useAuth } from '../hooks/useAuth';
import { Search, Save } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGestor, setSelectedGestor] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  
  const [isSaving, setIsSaving] = useState(false);
  const [updatedRecords, setUpdatedRecords] = useState<Map<string, Partial<DailyRecord>>>(new Map());

  const fetchGestores = useCallback(async () => {
    try {
        const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
        const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
        setGestores(gestoresList);
        // Set default gestor filter if not admin
        if (!isAdmin && gestorProfile) {
            setSelectedGestor(gestorProfile.nome);
        }
    } catch (error) {
        console.error("Error fetching gestores:", error);
    }
  }, [isAdmin, gestorProfile]);

  const fetchRecords = useCallback(async (date: string) => {
    setLoading(true);
    setRecords([]);
    try {
      const targetDate = new Date(date);
      targetDate.setUTCHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(targetDate);

      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      const endOfDay = Timestamp.fromDate(nextDay);

      const q = query(collection(db, 'registros_diarios'), where('data', '>=', startOfDay), where('data', '<', endOfDay));
      const querySnapshot = await getDocs(q);

      const recordsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });
      setRecords(recordsList);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
      setUpdatedRecords(new Map()); // Clear pending changes on new fetch
    }
  }, []);

  useEffect(() => {
    fetchGestores();
  }, [fetchGestores]);

  useEffect(() => {
    if (selectedDate) {
      fetchRecords(selectedDate);
    }
  }, [selectedDate, fetchRecords]);
  
  const handleCreateDailyRecords = async () => {
    if (!selectedDate) {
        alert('Por favor, selecione uma data.');
        return;
    }
    const confirmCreate = window.confirm(`Deseja criar os registros para o dia ${new Date(selectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}? Motoristas já existentes nesta data não serão duplicados.`);
    if (!confirmCreate) return;

    setLoading(true);
    try {
        const targetDate = new Date(selectedDate);
        targetDate.setUTCHours(12, 0, 0, 0); // Use noon to avoid timezone issues
        
        // 1. Get existing records for the day to avoid duplicates
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        const existingRecordsQuery = query(collection(db, 'registros_diarios'), where('data', '>=', Timestamp.fromDate(startOfDay)), where('data', '<=', Timestamp.fromDate(endOfDay)));

        const existingRecordsSnapshot = await getDocs(existingRecordsQuery);
        const existingDrivers = new Set(existingRecordsSnapshot.docs.map(doc => doc.data().motorista));

        // 2. Get all active drivers
        const driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
        const driversSnapshot = await getDocs(driversQuery);
        
        const batch = writeBatch(db);
        let newRecordsCount = 0;
        
        const dateTimestamp = Timestamp.fromDate(targetDate);

        driversSnapshot.forEach(doc => {
            const driver = { id: doc.id, ...doc.data() } as Motorista;
            if (!existingDrivers.has(driver.nome)) {
                const newRecordRef = doc(collection(db, 'registros_diarios'));
                batch.set(newRecordRef, {
                    motorista: driver.nome,
                    data: dateTimestamp,
                    gestor: driver.gestor,
                    placas: '',
                    status: 'JORNADA',
                    statusViagem: '',
                    horaExtra: '',
                    diasEmJornada: '',
                    lastModifiedBy: user?.email || 'unknown',
                });
                newRecordsCount++;
            }
        });
        
        if (newRecordsCount > 0) {
            await batch.commit();
            alert(`${newRecordsCount} novos registros criados com sucesso!`);
            fetchRecords(selectedDate); // Refresh records
        } else {
            alert('Nenhum novo motorista para adicionar. Todos os motoristas ativos já possuem registro para esta data.');
        }

    } catch (error) {
        console.error("Error creating daily records:", error);
        alert('Ocorreu um erro ao criar os registros.');
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateRecord = (id: string, field: keyof DailyRecord, value: any) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setUpdatedRecords(prev => {
        const newMap = new Map(prev);
        const currentUpdates = newMap.get(id) || {};
        newMap.set(id, { ...currentUpdates, [field]: value });
        return newMap;
    });
  };

  const handleSaveChanges = async () => {
    if (updatedRecords.size === 0) {
        alert("Nenhuma alteração para salvar.");
        return;
    }
    setIsSaving(true);
    const batch = writeBatch(db);
    updatedRecords.forEach((changes, id) => {
        const recordRef = doc(db, 'registros_diarios', id);
        batch.update(recordRef, { ...changes, lastModifiedBy: user?.email || 'unknown' });
    });

    try {
        await batch.commit();
        alert("Alterações salvas com sucesso!");
        setUpdatedRecords(new Map());
    } catch (error) {
        console.error("Error saving changes:", error);
        alert("Falha ao salvar as alterações.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteRecord = async (id: string) => {
      const recordToDelete = records.find(r => r.id === id);
      if (!recordToDelete) return;
      
      const confirmDelete = window.confirm(`Tem certeza que deseja excluir o registro de ${recordToDelete.motorista}?`);
      if (confirmDelete) {
          try {
              await deleteDoc(doc(db, 'registros_diarios', id));
              setRecords(prev => prev.filter(r => r.id !== id));
              alert('Registro excluído com sucesso.');
          } catch(error) {
              console.error("Error deleting record: ", error);
              alert('Falha ao excluir o registro.');
          }
      }
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter(record => {
        const gestorMatch = !selectedGestor || record.gestor === selectedGestor;
        const searchMatch = !searchTerm || record.motorista.toLowerCase().includes(searchTerm.toLowerCase());
        return gestorMatch && searchMatch;
      })
      .sort((a, b) => a.motorista.localeCompare(b.motorista));
  }, [records, selectedGestor, searchTerm]);
  
  const hasPendingChanges = updatedRecords.size > 0;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                  <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                  <input
                      type="date"
                      id="date-picker"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full input-style"
                  />
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
              
              <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="search-driver" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar Motorista</label>
                  <div className="relative">
                      <input
                          type="text"
                          id="search-driver"
                          placeholder="Nome do motorista..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full input-style pl-10"
                      />
                      <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
              </div>

              {isAdmin && (
                  <button
                      onClick={handleCreateDailyRecords}
                      disabled={loading}
                      className="btn-secondary w-full"
                  >
                      Gerar Dia
                  </button>
              )}
          </div>
      </div>
      
      {hasPendingChanges && (
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-md flex justify-between items-center">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Você tem alterações não salvas.</p>
              <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="btn-primary"
              >
                  <Save className="h-5 w-5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
          </div>
      )}

      {loading ? (
        <div className="text-center p-8">Carregando registros...</div>
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
