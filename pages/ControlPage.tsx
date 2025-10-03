import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy, writeBatch, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyRecord, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { useAuth } from '../hooks/useAuth';
import { Search, Filter, PlusCircle } from 'lucide-react';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [gestores, setGestores] = useState<string[]>([]);
  const [selectedGestor, setSelectedGestor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros de coluna
  const [statusFilter, setStatusFilter] = useState('');
  const [statusViagemFilter, setStatusViagemFilter] = useState('');
  const [horaExtraFilter, setHoraExtraFilter] = useState('');

  const fetchRecords = async () => {
    if (!user) return;
    if (isAdmin && !selectedGestor) {
      setRecords([]);
      setGestores([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDirtyRecords(new Map()); // Limpa alterações pendentes ao buscar novos dados

    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const recordsRef = collection(db, 'daily_records');
      let q;

      if (isAdmin) {
        q = query(recordsRef,
          where('data', '>=', Timestamp.fromDate(start)),
          where('data', '<=', Timestamp.fromDate(end)),
          where('gestor', '==', selectedGestor),
          orderBy('data', 'desc'),
        );
      } else if (gestorProfile) {
        q = query(recordsRef,
          where('data', '>=', Timestamp.fromDate(start)),
          where('data', '<=', Timestamp.fromDate(end)),
          where('gestor', '==', gestorProfile.nome),
          orderBy('data', 'desc'),
        );
      } else {
        setIsLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      const fetchedRecords = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });

      setRecords(fetchedRecords);
      
      // Extrair gestores para o filtro (apenas para admin)
      if (isAdmin) {
          const gestorListQuery = query(collection(db, 'gestores'), orderBy('nome'));
          const gestorSnapshot = await getDocs(gestorListQuery);
          const gestorNames = gestorSnapshot.docs.map(doc => doc.data().nome as string);
          setGestores(gestorNames);
      }

    } catch (err) {
      console.error(err);
      setError('Falha ao carregar os dados. Verifique se os índices do Firestore foram criados corretamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
      // Carrega a lista de gestores para o admin na primeira renderização
      if (isAdmin) {
          const fetchGestores = async () => {
              const gestorListQuery = query(collection(db, 'gestores'), orderBy('nome'));
              const gestorSnapshot = await getDocs(gestorListQuery);
              const gestorNames = gestorSnapshot.docs.map(doc => doc.data().nome as string);
              setGestores(gestorNames);
          };
          fetchGestores();
      }
  }, [isAdmin]);

  const handleUpdateRecord = (id: string, field: keyof DailyRecord, value: any) => {
    const originalRecord = records.find(r => r.id === id);
    if (!originalRecord) return;

    const updatedRecord = { ...(dirtyRecords.get(id) || originalRecord), [field]: value };
    
    setDirtyRecords(prev => new Map(prev).set(id, updatedRecord));
  };
  
  const handleSaveChanges = async () => {
      if (dirtyRecords.size === 0) return;
      setIsSaving(true);
      setError(null);

      try {
          const batch = writeBatch(db);
          dirtyRecords.forEach((record, id) => {
              const docRef = doc(db, 'daily_records', id);
              // Clonamos o objeto e removemos o 'id' para não salvá-lo no documento
              const { id: recordId, ...dataToSave } = record;
              batch.update(docRef, {
                  ...dataToSave,
                  lastModifiedBy: user?.email, // Auditoria
              });
          });
          await batch.commit();
          setDirtyRecords(new Map()); // Limpa as alterações
          await fetchRecords(); // Recarrega os dados para confirmar
      } catch(err) {
          console.error(err);
          setError("Falha ao salvar as alterações.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!isAdmin || !window.confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      await deleteDoc(doc(db, 'daily_records', id));
      await fetchRecords();
    } catch (err) {
      console.error(err);
      setError("Falha ao excluir o registro.");
    }
  };

  const handleAddNewRecord = async () => {
    if (!isAdmin || !selectedGestor) {
      alert("Por favor, selecione um gestor para adicionar o registro.");
      return;
    }
    const driverName = prompt("Digite o nome do novo motorista:");
    if (!driverName) return;

    try {
        await addDoc(collection(db, 'daily_records'), {
            motorista: driverName.toUpperCase(),
            gestor: selectedGestor,
            data: Timestamp.fromDate(new Date(startDate)), // Usa a data de início do filtro
            status: 'JORNADA',
            statusViagem: 'EM VIAGEM',
            horaExtra: 'NÃO AUTORIZADO',
            lastModifiedBy: user?.email,
        });
        await fetchRecords();
    } catch (err) {
        console.error(err);
        setError("Falha ao adicionar novo registro.");
    }
  };

  const filteredRecords = useMemo(() => {
    const dirtyRecordsArray = Array.from(dirtyRecords.values());

    const combinedRecords = records.map(record => 
        dirtyRecords.get(record.id) || record
    );

    return combinedRecords.filter(r => {
        const searchTermMatch = searchTerm === '' || 
            r.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.placas && r.placas.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const statusMatch = statusFilter === '' || r.status === statusFilter;
        const statusViagemMatch = statusViagemFilter === '' || r.statusViagem === statusViagemFilter;
        const horaExtraMatch = horaExtraFilter === '' || r.horaExtra === horaExtraFilter;

        return searchTermMatch && statusMatch && statusViagemMatch && horaExtraMatch;
    });
  }, [records, dirtyRecords, searchTerm, statusFilter, statusViagemFilter, horaExtraFilter]);


  return (
    <section>
      {/* Barra de Filtros */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium">Data Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
          </div>
          <div>
            <label className="text-sm font-medium">Data Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium">Gestor</label>
              <select value={selectedGestor} onChange={e => setSelectedGestor(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                <option value="">Selecione um gestor</option>
                {gestores.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button onClick={fetchRecords} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Buscar</button>
          </div>
        </div>
        {isAdmin && !selectedGestor && <p className="text-sm text-yellow-500 mt-2">Administrador, por favor selecione um gestor para carregar os dados.</p>}
      </div>

      {/* Barra de Ações e Busca */}
       <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-1/3">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
             <input
                type="text"
                placeholder="Buscar motorista ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
             />
          </div>
           <div className="flex items-center gap-4">
              {isAdmin && (
                  <button onClick={handleAddNewRecord} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition">
                      <PlusCircle className="h-5 w-5"/> Adicionar Registro
                  </button>
              )}
               <button 
                  onClick={handleSaveChanges} 
                  disabled={dirtyRecords.size === 0 || isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition"
              >
                  {isSaving ? 'Salvando...' : `Salvar Alterações (${dirtyRecords.size})`}
              </button>
           </div>
       </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg shadow-md">
        {error && <p className="text-red-500 p-4 text-center">{error}</p>}
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-3 py-3">Motorista</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Gestor</th>
              <th className="px-3 py-3">Placas</th>
              <th className="px-3 py-3">
                <div className="flex items-center gap-1">
                    Status <Filter className="h-4 w-4"/>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent text-xs p-0 border-0 focus:ring-0">
                        <option value="">Todos</option>
                        {STATUS_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
              </th>
               <th className="px-3 py-3">
                 <div className="flex items-center gap-1">
                    Status Viagem <Filter className="h-4 w-4"/>
                    <select value={statusViagemFilter} onChange={e => setStatusViagemFilter(e.target.value)} className="bg-transparent text-xs p-0 border-0 focus:ring-0">
                        <option value="">Todos</option>
                        {STATUS_VIAGEM_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
              </th>
              <th className="px-3 py-3">
                 <div className="flex items-center gap-1">
                    Hora Extra <Filter className="h-4 w-4"/>
                    <select value={horaExtraFilter} onChange={e => setHoraExtraFilter(e.target.value)} className="bg-transparent text-xs p-0 border-0 focus:ring-0">
                        <option value="">Todos</option>
                        {HORA_EXTRA_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
              </th>
              <th className="px-3 py-3">Dias em Jornada</th>
              <th className="px-3 py-3">Justificativa Jornada</th>
              <th className="px-3 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center p-4">Carregando...</td></tr>
            ) : filteredRecords.length > 0 ? (
              filteredRecords.sort((a, b) => a.motorista.localeCompare(b.motorista)).map(record => (
                <DriverRow
                  key={record.id}
                  record={record}
                  onUpdate={handleUpdateRecord}
                  onDelete={handleDeleteRecord}
                  isAdmin={isAdmin}
                />
              ))
            ) : (
              <tr><td colSpan={10} className="text-center p-4">Nenhum registro encontrado para os filtros selecionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
