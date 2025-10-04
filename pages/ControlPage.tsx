import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DriverRow } from '../components/DriverRow';
import { Search, Users } from 'lucide-react';
import { Save } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [selectedGestor, setSelectedGestor] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [dirtyRecords, setDirtyRecords] = useState<Map<string, DailyRecord>>(new Map());

  // Carrega a lista de gestores para o filtro do admin
  useEffect(() => {
    if (isAdmin) {
      const fetchGestores = async () => {
        try {
          const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
          const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
          setGestores(gestoresList);
        } catch (err) {
          console.error("Erro ao buscar gestores:", err);
        }
      };
      fetchGestores();
    }
  }, [isAdmin]);
  
  const handleFetchData = useCallback(() => {
    const gestorToQuery = isAdmin ? selectedGestor : gestorProfile?.nome;

    if (!gestorToQuery) {
        if (!isAdmin) setError("Perfil de gestor não encontrado.");
        setRecords([]);
        return;
    }
    
    setLoading(true);
    setError(null);

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'daily_records'),
      where('gestor', '==', gestorToQuery),
      where('data', '>=', Timestamp.fromDate(start)),
      where('data', '<=', Timestamp.fromDate(end))
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRecords = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as DailyRecord;
      }).sort((a,b) => a.motorista.localeCompare(b.motorista));
      
      setRecords(fetchedRecords);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar registros:", err);
      setError(`Falha ao carregar dados. Verifique os índices do Firestore.`);
      setLoading(false);
    });

    return unsubscribe;
  }, [isAdmin, selectedGestor, gestorProfile, startDate, endDate]);

  // Efeito para carregar dados automaticamente para supervisores
  useEffect(() => {
    if (!isAdmin && gestorProfile) {
        const unsubscribe = handleFetchData();
        return () => unsubscribe && unsubscribe();
    }
  }, [isAdmin, gestorProfile, handleFetchData]);


  const handleUpdateRecord = (id: string, field: keyof DailyRecord, value: any) => {
    const originalRecord = records.find(r => r.id === id);
    if (originalRecord) {
      const updatedRecord = { ...originalRecord, [field]: value };
      setDirtyRecords(prev => new Map(prev).set(id, updatedRecord));
      // Optimistic UI update
      setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
    }
  };

  const handleSaveChanges = async () => {
    if (dirtyRecords.size === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      dirtyRecords.forEach((record, id) => {
        const { id: recordId, ...dataToSave } = record;
        const recordRef = doc(db, 'daily_records', recordId);
        batch.update(recordRef, {
            ...dataToSave,
            data: Timestamp.fromDate(new Date(record.data)), // Garante que a data seja um Timestamp
            lastModifiedBy: user?.email || 'unknown',
        });
      });
      await batch.commit();
      setDirtyRecords(new Map());
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
      setError("Falha ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteRecord = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este registro?")) {
          try {
              await deleteDoc(doc(db, 'daily_records', id));
              // onSnapshot irá atualizar a UI automaticamente
          } catch(err) {
              console.error("Error deleting record: ", err);
              setError("Falha ao excluir o registro.");
          }
      }
  }
  
   const handleGenerateRecords = async () => {
    const gestorToGenerate = isAdmin ? selectedGestor : gestorProfile?.nome;
    if (!gestorToGenerate) {
      alert("Por favor, selecione um gestor para gerar os registros.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
        const q = query(collection(db, "motoristas"), where("gestor", "==", gestorToGenerate), where("statusEmprego", "==", "ATIVO"));
        const motoristasSnapshot = await getDocs(q);
        const motoristasAtivos = motoristasSnapshot.docs.map(d => d.data() as Motorista);

        const targetDate = new Date(startDate); // Gera para a data de início selecionada
        targetDate.setUTCHours(0, 0, 0, 0);

        const motoristasComRegistro = new Set(records.map(r => r.motorista));
        
        const motoristasParaCriar = motoristasAtivos.filter(m => !motoristasComRegistro.has(m.nome));

        if (motoristasParaCriar.length === 0) {
            alert("Todos os motoristas ativos já possuem registro para esta data.");
            setLoading(false);
            return;
        }

        const batch = writeBatch(db);
        motoristasParaCriar.forEach(motorista => {
            const newRecordRef = doc(collection(db, 'daily_records'));
            batch.set(newRecordRef, {
                motorista: motorista.nome,
                gestor: motorista.gestor,
                data: Timestamp.fromDate(targetDate),
                status: 'JORNADA',
                statusViagem: 'EM VIAGEM',
                horaExtra: 'NÃO AUTORIZADO',
                lastModifiedBy: user?.email || 'system-generated',
            });
        });

        await batch.commit();
        alert(`${motoristasParaCriar.length} registros criados com sucesso!`);
    } catch (err) {
        console.error("Erro ao gerar registros:", err);
        setError("Falha ao gerar registros. Verifique os índices do Firestore.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full input-style" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Fim</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full input-style" />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filtrar por Gestor</label>
              <select value={selectedGestor} onChange={(e) => setSelectedGestor(e.target.value)} className="w-full input-style">
                <option value="">-- Selecione --</option>
                {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
              </select>
            </div>
          )}
          
          {isAdmin && (
             <button onClick={() => handleFetchData()} className="btn-secondary w-full">Buscar</button>
          )}

        </div>
         <div className="mt-4 flex flex-col sm:flex-row gap-4">
             <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Buscar motorista na lista atual..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full input-style pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              </div>
              <button onClick={handleGenerateRecords} className="btn-primary" disabled={loading}>
                  <Users className="h-5 w-5" />
                  <span>Gerar Registros Ativos</span>
              </button>
              {dirtyRecords.size > 0 && (
                <button onClick={handleSaveChanges} className="btn-success" disabled={loading}>
                    <Save className="h-5 w-5"/>
                    <span>Salvar Alterações ({dirtyRecords.size})</span>
                </button>
              )}
        </div>
      </div>

        {error && <p className="text-center text-red-500 mb-4">{error}</p>}

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-3 py-3" style={{minWidth: '250px'}}>Motorista</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '150px'}}>Placas</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '180px'}}>Status</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '180px'}}>Status Viagem</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '180px'}}>Hora Extra</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '150px'}}>Dias em Jornada</th>
              <th scope="col" className="px-3 py-3" style={{minWidth: '250px'}}>{'Justificativa Jornada > 7 Dias'}</th>
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
              <tr><td colSpan={8} className="text-center p-8">Nenhum registro encontrado para os filtros selecionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};