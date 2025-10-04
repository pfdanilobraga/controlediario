import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { useAuth } from '../hooks/useAuth';
import { Search, Users, Save, Filter } from 'lucide-react';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(formatDateForInput(new Date()));
  const [endDate, setEndDate] = useState(formatDateForInput(new Date()));
  const [selectedGestor, setSelectedGestor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('');
  const [statusViagemFilter, setStatusViagemFilter] = useState('');
  const [horaExtraFilter, setHoraExtraFilter] = useState('');

  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());

  useEffect(() => {
    if (isAdmin) {
      const fetchGestores = async () => {
        try {
          const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
          const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
          setGestores(gestoresList.sort((a,b) => a.nome.localeCompare(b.nome)));
        } catch (err) {
            console.error("Erro ao buscar gestores:", err);
        }
      };
      fetchGestores();
    }
  }, [isAdmin]);

  const handleSearch = useCallback(async () => {
    if (!user) return;
    
    const targetGestor = isAdmin ? selectedGestor : gestorProfile?.nome;
    if (isAdmin && !targetGestor) {
      setError("Por favor, selecione um gestor para buscar.");
      setRecords([]);
      return;
    }
    
    if (!targetGestor) {
      setError("Perfil de gestor não pôde ser verificado.");
      setRecords([]);
      return;
    }

    setLoading(true);
    setError(null);
    setRecords([]);
    setDirtyRecords(new Map());

    try {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      const recordsRef = collection(db, 'daily_records');
      let q;
      
      const gestorQuery = where('gestor', '==', targetGestor.toUpperCase());
      const dateQueryStart = where('data', '>=', Timestamp.fromDate(start));
      const dateQueryEnd = where('data', '<=', Timestamp.fromDate(end));
      
      q = query(recordsRef, gestorQuery, dateQueryStart, dateQueryEnd, orderBy('data', 'desc'), orderBy('motorista', 'asc'));

      const querySnapshot = await getDocs(q);
      const recordsList: DailyRecord[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      });

      setRecords(recordsList);

    } catch (err: any) {
        console.error("Erro ao buscar registros:", err);
        if (err.code === 'failed-precondition') {
            setError('Falha ao carregar dados. O índice do Firestore está faltando. Verifique os índices para a coleção "daily_records".');
        } else {
            setError("Falha ao carregar os dados. Tente novamente mais tarde.");
        }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, selectedGestor, startDate, endDate, gestorProfile]);

  useEffect(() => {
    if (!isAdmin && gestorProfile) {
      handleSearch();
    }
  }, [isAdmin, gestorProfile, handleSearch]);

  const handleUpdateRecord = (id: string, field: keyof DailyRecord, value: any) => {
    const originalRecord = records.find(r => r.id === id);
    if (!originalRecord) return;
    
    const updatedRecord = { ...originalRecord, [field]: value };
    
    setRecords(prevRecords =>
      prevRecords.map(record => (record.id === id ? updatedRecord : record))
    );
    
    setDirtyRecords(prev => new Map(prev).set(id, updatedRecord));
  };
  
  const handleSaveChanges = async () => {
    if (dirtyRecords.size === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      dirtyRecords.forEach((record, id) => {
        const recordRef = doc(db, 'daily_records', id);
        const dataToSave = {
            ...record,
            data: Timestamp.fromDate(record.data),
            lastModifiedBy: user?.email,
        };
        delete (dataToSave as any).id;
        batch.update(recordRef, dataToSave);
      });
      await batch.commit();
      setDirtyRecords(new Map());
      alert("Alterações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
      setError("Falha ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const generateDailyRecords = async () => {
    const targetGestor = (isAdmin ? selectedGestor : gestorProfile?.nome);
    if (!targetGestor) {
      alert("Por favor, selecione um gestor.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const targetDate = new Date(startDate);
      targetDate.setUTCHours(0,0,0,0);

      const motoristasRef = collection(db, 'motoristas');
      const qMotoristas = query(motoristasRef, 
        where('gestor', '==', targetGestor.toUpperCase()),
        where('statusEmprego', '==', 'ATIVO')
      );
      
      const motoristasSnap = await getDocs(qMotoristas);
      const activeMotoristas = motoristasSnap.docs.map(d => d.data() as Motorista);

      const motoristasParaGerar = activeMotoristas.filter(m => {
          const demissao = m.dataDemissao ? new Date(m.dataDemissao) : null;
          const feriasInicio = m.feriasInicio ? new Date(m.feriasInicio) : null;
          const feriasFim = m.feriasFim ? new Date(m.feriasFim) : null;
          
          if (demissao && targetDate > demissao) return false;
          if (feriasInicio && feriasFim && targetDate >= feriasInicio && targetDate <= feriasFim) return false;
          
          return !records.some(r => r.motorista === m.nome && r.data.getTime() === targetDate.getTime());
      });

      if (motoristasParaGerar.length === 0) {
        alert("Todos os motoristas ativos para este gestor já possuem registro para a data selecionada.");
        setIsGenerating(false);
        return;
      }

      const batch = writeBatch(db);
      motoristasParaGerar.forEach(motorista => {
        const newRecordRef = doc(collection(db, 'daily_records'));
        const newRecordData = {
          motorista: motorista.nome.toUpperCase(),
          gestor: motorista.gestor.toUpperCase(),
          data: Timestamp.fromDate(targetDate),
          placas: '',
          status: 'JORNADA',
          statusViagem: 'EM VIAGEM',
          horaExtra: 'NÃO AUTORIZADO',
          diasEmJornada: '0',
          lastModifiedBy: user?.email,
          justificativaJornada: '',
        };
        batch.set(newRecordRef, newRecordData);
      });
      
      await batch.commit();
      alert(`${motoristasParaGerar.length} novos registros criados com sucesso!`);
      handleSearch();

    } catch (err: any) {
      console.error("Erro ao gerar registros:", err);
      if (err.code === 'failed-precondition') {
        setError("Índice do Firestore faltando para gerar registros. Crie um índice em 'motoristas' com 'gestor' (ASC) e 'statusEmprego' (ASC).");
      } else {
        setError("Ocorreu um erro ao criar os registros.");
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDeleteRecord = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      try {
        await deleteDoc(doc(db, 'daily_records', id));
        setRecords(prev => prev.filter(rec => rec.id !== id));
        if(dirtyRecords.has(id)) {
            const newDirty = new Map(dirtyRecords);
            newDirty.delete(id);
            setDirtyRecords(newDirty);
        }
      } catch (error) {
        console.error("Erro ao excluir registro:", error);
        setError("Falha ao excluir o registro.");
      }
    }
  };
  
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
        const searchMatch = searchTerm === '' ||
            record.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.placas?.toLowerCase().includes(searchTerm.toLowerCase());
            
        const statusMatch = statusFilter === '' || record.status === statusFilter;
        const viagemMatch = statusViagemFilter === '' || record.statusViagem === statusViagemFilter;
        const horaExtraMatch = horaExtraFilter === '' || record.horaExtra === horaExtraFilter;
        
        return searchMatch && statusMatch && viagemMatch && horaExtraMatch;
    });
  }, [records, searchTerm, statusFilter, statusViagemFilter, horaExtraFilter]);


  const ColumnFilter: React.FC<{options: string[], value: string, onChange: (value: string) => void}> = ({options, value, onChange}) => (
    <div className="relative flex items-center">
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full text-xs bg-slate-100 dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md p-1 pl-2 pr-7 appearance-none focus:ring-1 focus:ring-blue-500"
        >
            <option value="">Todos</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <Filter className="h-3 w-3 absolute right-2 pointer-events-none text-slate-400"/>
    </div>
  );
  
  const inputStyle = "w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition";
  const btnPrimary = "flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors h-10";
  const btnSecondary = "flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors h-10";


  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
            <div>
                <label className="text-sm font-medium">Data Início</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputStyle}/>
            </div>
            <div>
                <label className="text-sm font-medium">Fim de dados</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputStyle}/>
            </div>
            {isAdmin && (
                <div>
                    <label className="text-sm font-medium">Filtrar por Gestor</label>
                    <select value={selectedGestor} onChange={e => setSelectedGestor(e.target.value)} className={inputStyle}>
                        <option value="">-- Selecione --</option>
                        {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
                    </select>
                </div>
            )}
             <button onClick={handleSearch} disabled={loading || (isAdmin && !selectedGestor)} className={btnPrimary}>
                {loading ? 'Buscando...' : 'Buscar'}
            </button>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
                type="text"
                placeholder="Buscar motorista ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputStyle} pl-10`}
            />
        </div>
        <div className="flex items-center gap-4">
             {<button
                onClick={generateDailyRecords}
                disabled={isGenerating || (isAdmin && !selectedGestor)}
                className={btnSecondary}
                title="Gerar registros para motoristas ativos que ainda não possuem para a data de início selecionada"
              >
                <Users className="h-5 w-5" />
                <span>{isGenerating ? 'Gerando...' : 'Gerar Registros Ativos'}</span>
              </button>
             }
             <button
                onClick={handleSaveChanges}
                disabled={loading || dirtyRecords.size === 0}
                className={btnPrimary}
              >
                <Save className="h-5 w-5" />
                <span>Salvar Alterações ({dirtyRecords.size})</span>
              </button>
        </div>
      </div>

      {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>Motorista / Data</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Placas</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>
                <div className="flex flex-col gap-1">
                    <span>STATUS</span>
                    <ColumnFilter options={STATUS_OPCOES} value={statusFilter} onChange={setStatusFilter} />
                </div>
              </th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>
                <div className="flex flex-col gap-1">
                    <span>STATUS VIAGEM</span>
                    <ColumnFilter options={STATUS_VIAGEM_OPCOES} value={statusViagemFilter} onChange={setStatusViagemFilter} />
                </div>
              </th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '180px' }}>
                <div className="flex flex-col gap-1">
                    <span>HORA EXTRA</span>
                    <ColumnFilter options={HORA_EXTRA_OPCOES} value={horaExtraFilter} onChange={setHoraExtraFilter} />
                </div>
              </th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '150px' }}>Dias em Jornada</th>
              <th scope="col" className="px-3 py-3" style={{ minWidth: '250px' }}>{'Justificativa Jornada > 7 Dias'}</th>
              <th scope="col" className="px-3 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan={8} className="text-center py-8">Carregando...</td></tr>
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
                <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        Nenhum registro encontrado para os filtros selecionados.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
