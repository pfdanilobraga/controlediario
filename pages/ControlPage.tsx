import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, writeBatch, Timestamp, deleteDoc, serverTimestamp, orderBy, addDoc } from 'firebase/firestore';
import { DailyRecord, Gestor, Motorista } from '../types';
import { DriverRow } from '../components/DriverRow';
import { Search, Save, Filter, Users } from 'lucide-react';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [gestoresList, setGestoresList] = useState<string[]>([]);
  const [selectedGestor, setSelectedGestor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const fetchGestores = useCallback(async () => {
    if (!isAdmin) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'gestores'));
        const gestores = querySnapshot.docs.map(doc => doc.data().nome as string);
        setGestoresList(gestores);
    } catch (err) {
        console.error("Erro ao buscar gestores:", err);
    }
  }, [isAdmin]);
  
  useEffect(() => {
    fetchGestores();
  }, [fetchGestores]);

  const fetchRecords = useCallback(async () => {
    const gestorToQuery = isAdmin ? selectedGestor : gestorProfile?.nome;
    if (!gestorToQuery) {
        if (!isAdmin) setError("Perfil de gestor não encontrado.");
        setRecords([]);
        return;
    }
    
    setLoading(true);
    setError(null);
    setDirtyRecords(new Map());

    try {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      let recordsQuery = query(
        collection(db, 'daily_records'),
        where('gestor', '==', gestorToQuery),
        where('data', '>=', Timestamp.fromDate(start)),
        where('data', '<=', Timestamp.fromDate(end)),
        orderBy('data', 'desc'),
        orderBy('motorista', 'asc')
      );

      const querySnapshot = await getDocs(recordsQuery);
      const recordsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });
      setRecords(recordsList);
    } catch (err: any) {
      console.error("Error fetching records:", err);
      setError(`Falha ao carregar os dados. Verifique se o índice do Firestore foi criado corretamente (em daily_records: gestor ASC, data ASC, motorista ASC).`);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile, selectedGestor, startDate, endDate]);

  // Carregamento automático para supervisores
  useEffect(() => {
    if (!isAdmin && gestorProfile) {
      fetchRecords();
    }
  }, [isAdmin, gestorProfile, fetchRecords]);

  const handleUpdate = (id: string, field: keyof DailyRecord, value: any) => {
    const originalRecord = records.find(r => r.id === id);
    if (originalRecord) {
        const updatedRecord = { ...originalRecord, [field]: value };
        setDirtyRecords(prev => new Map(prev).set(id, updatedRecord));
        // Update local state for immediate UI feedback
        setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
    }
  };

  const handleSaveChanges = async () => {
    if (dirtyRecords.size === 0) return;
    setLoading(true);
    const batch = writeBatch(db);
    dirtyRecords.forEach((record, id) => {
        const recordRef = doc(db, 'daily_records', id);
        const { id: recordId, data, ...rest } = record;
        batch.update(recordRef, {
            ...rest,
            data: Timestamp.fromDate(new Date(data)),
            lastModifiedBy: gestorProfile?.id || 'admin'
        });
    });

    try {
        await batch.commit();
        setDirtyRecords(new Map());
        alert("Alterações salvas com sucesso!");
    } catch (error) {
        console.error("Error saving changes:", error);
        alert("Falha ao salvar as alterações.");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
     if (window.confirm("Tem certeza que deseja excluir este registro?")) {
        try {
            await deleteDoc(doc(db, "daily_records", id));
            setRecords(prev => prev.filter(r => r.id !== id));
            setDirtyRecords(prev => {
                const newDirty = new Map(prev);
                newDirty.delete(id);
                return newDirty;
            });
        } catch (error) {
            console.error("Error deleting record:", error);
        }
    }
  };

  const generateTodaysRecords = async () => {
    setLoading(true);
    try {
      // 1. Get all active drivers for the selected manager
      const motoristasRef = collection(db, 'motoristas');
      const gestorToQuery = isAdmin ? selectedGestor : gestorProfile?.nome;
      if(!gestorToQuery) {
        alert("Selecione um gestor para gerar os registros.");
        setLoading(false);
        return;
      }

      const qDrivers = query(
        motoristasRef, 
        where('gestor', '==', gestorToQuery),
        where('statusEmprego', '==', 'ATIVO')
      );
      const driversSnapshot = await getDocs(qDrivers);
      const allActiveDrivers = driversSnapshot.docs.map(d => d.data() as Motorista);

      // 2. Filter out drivers on vacation on the selected date
      const selectedDate = new Date(startDate);
      selectedDate.setUTCHours(12,0,0,0);
      
      const driversToLog = allActiveDrivers.filter(driver => {
        if (driver.feriasInicio && driver.feriasFim) {
          const feriasStart = new Date(driver.feriasInicio);
          const feriasEnd = new Date(driver.feriasFim);
           return selectedDate < feriasStart || selectedDate > feriasEnd;
        }
        return true;
      });

      // 3. Get records that already exist for this day and manager
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0,0,0,0);
      const endOfDay = new Date(startDate);
      endOfDay.setUTCHours(23,59,59,999);
      
      const qExisting = query(
        collection(db, 'daily_records'),
        where('gestor', '==', gestorToQuery),
        where('data', '>=', Timestamp.fromDate(startOfDay)),
        where('data', '<=', Timestamp.fromDate(endOfDay))
      );
      const existingSnapshot = await getDocs(qExisting);
      const existingDriverNames = new Set(existingSnapshot.docs.map(d => d.data().motorista));

      // 4. Determine which drivers need a new record
      const driversWithoutLog = driversToLog.filter(d => !existingDriverNames.has(d.nome));

      if (driversWithoutLog.length === 0) {
        alert(`Todos os motoristas ativos de ${gestorToQuery} para ${startOfDay.toLocaleDateString('pt-BR')} já possuem registro.`);
        setLoading(false);
        return;
      }

      // 5. Create new records in a batch
      const batch = writeBatch(db);
      driversWithoutLog.forEach(driver => {
        const newRecordRef = doc(collection(db, 'daily_records'));
        batch.set(newRecordRef, {
            motorista: driver.nome,
            gestor: driver.gestor,
            data: Timestamp.fromDate(startOfDay),
            status: 'JORNADA',
            statusViagem: 'EM VIAGEM',
            horaExtra: 'NÃO AUTORIZADO',
            placas: '',
            diasEmJornada: '',
            justificativaJornada: '',
            lastModifiedBy: gestorProfile?.id || 'admin'
        });
      });

      await batch.commit();
      alert(`${driversWithoutLog.length} novo(s) registro(s) criado(s) com sucesso!`);
      fetchRecords();

    } catch (err) {
      console.error("Error generating records:", err);
      alert("Falha ao gerar registros.");
    } finally {
      setLoading(false);
    }
  };


  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const searchMatch = searchTerm === '' ||
        record.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.placas?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return record[key as keyof DailyRecord] === value;
      });
    });
  }, [records, searchTerm, columnFilters]);

  const FilterSelect: React.FC<{ options: string[], column: keyof DailyRecord }> = ({ options, column }) => (
     <div className="relative">
      <select
        value={columnFilters[column] || ''}
        onChange={e => setColumnFilters(prev => ({ ...prev, [column]: e.target.value }))}
        className="w-full text-xs p-2 pr-8 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md appearance-none"
      >
        <option value="">Todos</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
     </div>
  );

  return (
    <div>
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full input-style" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Fim</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full input-style" />
              </div>
               {isAdmin && (
                  <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar por Gestor</label>
                      <select value={selectedGestor} onChange={e => setSelectedGestor(e.target.value)} className="w-full input-style">
                          <option value="">Selecione um Gestor</option>
                          {gestoresList.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                  </div>
              )}
               <button onClick={fetchRecords} disabled={loading || (isAdmin && !selectedGestor)} className="btn-primary w-full">
                  {loading ? 'Buscando...' : 'Buscar'}
              </button>
          </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar motorista ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full sm:w-80 p-2 pl-10 text-sm input-style"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
            {isAdmin && (
                 <button onClick={generateTodaysRecords} disabled={loading || !selectedGestor} className="btn-secondary w-full">
                    <Users className="h-5 w-5" />
                    <span>Gerar Registros Ativos</span>
                </button>
            )}
            <button onClick={handleSaveChanges} disabled={loading || dirtyRecords.size === 0} className="btn-primary w-full">
                <Save className="h-5 w-5" />
                <span>Salvar Alterações ({dirtyRecords.size})</span>
            </button>
        </div>
      </div>

      {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg mb-4">{error}</p>}

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>Motorista</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Placas</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>
                    Status
                    <FilterSelect options={STATUS_OPCOES} column="status" />
                </th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>
                    Status Viagem
                    <FilterSelect options={STATUS_VIAGEM_OPCOES} column="statusViagem" />
                </th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>
                    Hora Extra
                    <FilterSelect options={HORA_EXTRA_OPCOES} column="horaExtra" />
                </th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Dias em Jornada</th>
                <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>{'Justificativa Jornada > 7 Dias'}</th>
                <th scope="col" className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center p-8">Carregando registros...</td></tr>
              ) : filteredRecords.length === 0 ? (
                 <tr><td colSpan={8} className="text-center p-8">Nenhum registro encontrado para os filtros selecionados.</td></tr>
              ) : (
                filteredRecords.map((record) => (
                  <DriverRow
                    key={record.id}
                    record={record}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
};
