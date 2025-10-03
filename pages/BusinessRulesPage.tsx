import React, { useState, useEffect } from 'react';
// Fix: Import `writeBatch` from `firebase/firestore` to resolve 'Cannot find name' error.
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Motorista } from '../types';
import { UserPlus } from 'lucide-react';

export const DriverManagementPage: React.FC = () => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para o formulário de novo motorista
  const [newDriverName, setNewDriverName] = useState('');
  const [newAdmissionDate, setNewAdmissionDate] = useState('');
  
  // Estados para edição em linha
  const [editingDriver, setEditingDriver] = useState<Motorista | null>(null);

  // Estado para adição em lote
  const [batchDriverNames, setBatchDriverNames] = useState('');

  const motoristasCollectionRef = collection(db, 'motoristas');

  const fetchMotoristas = async () => {
    setIsLoading(true);
    try {
      const q = query(motoristasCollectionRef, orderBy('nome'));
      const data = await getDocs(q);
      const fetchedMotoristas = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Motorista[];
      setMotoristas(fetchedMotoristas);
    } catch (err) {
      console.error(err);
      setError("Falha ao buscar a lista de motoristas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMotoristas();
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim()) return;
    try {
      await addDoc(motoristasCollectionRef, {
        nome: newDriverName.toUpperCase(),
        statusEmprego: 'ATIVO',
        dataAdmissao: newAdmissionDate ? new Date(newAdmissionDate) : null,
      });
      setNewDriverName('');
      setNewAdmissionDate('');
      await fetchMotoristas();
    } catch (err) {
      console.error(err);
      setError("Falha ao adicionar novo motorista.");
    }
  };

  const handleBatchAddDrivers = async () => {
    const names = batchDriverNames.split('\n').map(name => name.trim().toUpperCase()).filter(Boolean);
    if (names.length === 0) return;

    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const docRef = doc(motoristasCollectionRef); // Cria um novo documento com ID automático
        batch.set(docRef, {
          nome: name,
          statusEmprego: 'ATIVO',
        });
      });
      await batch.commit();
      setBatchDriverNames('');
      await fetchMotoristas();
    } catch (err) {
      console.error(err);
      setError("Falha ao adicionar motoristas em lote.");
    }
  };
  
  const handleUpdateDriver = async () => {
      if (!editingDriver) return;
      try {
          const driverDoc = doc(db, 'motoristas', editingDriver.id);
          // Omit 'id' from the object to be saved
          const { id, ...dataToSave } = editingDriver;
          await updateDoc(driverDoc, dataToSave);
          setEditingDriver(null);
          await fetchMotoristas();
      } catch (err) {
          console.error(err);
          setError("Falha ao atualizar motorista.");
      }
  };

  const renderDateField = (value: any, field: keyof Motorista) => {
    const dateValue = value instanceof Date ? value.toISOString().split('T')[0] : (value && value.toDate) ? value.toDate().toISOString().split('T')[0] : '';
    return (
        <input 
            type="date"
            className="w-full p-1 text-sm bg-slate-100 dark:bg-slate-700 rounded"
            value={dateValue}
            onChange={e => setEditingDriver(prev => prev ? {...prev, [field]: e.target.value ? new Date(e.target.value) : null } : null)}
        />
    )
  }

  return (
    <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna de Adicionar Motoristas */}
            <div className="lg:col-span-1 space-y-6">
                 {/* Adicionar Individualmente */}
                <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UserPlus /> Adicionar Novo Motorista</h2>
                    <form onSubmit={handleAddDriver} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Nome</label>
                            <input type="text" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} required className="w-full mt-1 p-2 rounded-md bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Data de Admissão</label>
                            <input type="date" value={newAdmissionDate} onChange={e => setNewAdmissionDate(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Adicionar Motorista</button>
                    </form>
                </div>
                {/* Adicionar em Lote */}
                <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Adicionar em Lote</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Cole uma lista de nomes de motoristas, um por linha.</p>
                    <textarea 
                        value={batchDriverNames}
                        onChange={e => setBatchDriverNames(e.target.value)}
                        rows={5}
                        className="w-full mt-1 p-2 rounded-md bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600"
                    />
                    <button onClick={handleBatchAddDrivers} className="w-full mt-2 bg-green-600 text-white p-2 rounded-md hover:bg-green-700">Salvar Motoristas em Lote</button>
                </div>
            </div>

            {/* Coluna da Lista de Motoristas */}
            <div className="lg:col-span-2">
                 <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold mb-4">Lista Mestra de Motoristas</h2>
                     {error && <p className="text-red-500 mb-4">{error}</p>}
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-2">Nome</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Admissão</th>
                                    <th className="px-4 py-2">Demissão</th>
                                    <th className="px-4 py-2">Início Férias</th>
                                    <th className="px-4 py-2">Fim Férias</th>
                                    <th className="px-4 py-2">Observações</th>
                                    <th className="px-4 py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={8} className="text-center p-4">Carregando...</td></tr>
                                ) : motoristas.map(m => (
                                    <tr key={m.id} className="border-b dark:border-slate-700">
                                        {editingDriver?.id === m.id ? (
                                            <>
                                                <td className="p-2"><input type="text" value={editingDriver.nome} onChange={e => setEditingDriver({...editingDriver, nome: e.target.value.toUpperCase()})} className="w-full p-1 text-sm bg-slate-100 dark:bg-slate-700 rounded"/></td>
                                                <td className="p-2">
                                                    <select value={editingDriver.statusEmprego} onChange={e => setEditingDriver({...editingDriver, statusEmprego: e.target.value as any})} className="w-full p-1 text-sm bg-slate-100 dark:bg-slate-700 rounded">
                                                        <option value="ATIVO">ATIVO</option>
                                                        <option value="DESLIGADO">DESLIGADO</option>
                                                    </select>
                                                </td>
                                                <td className="p-2">{renderDateField(editingDriver.dataAdmissao, 'dataAdmissao')}</td>
                                                <td className="p-2">{renderDateField(editingDriver.dataDemissao, 'dataDemissao')}</td>
                                                <td className="p-2">{renderDateField(editingDriver.dataInicioFerias, 'dataInicioFerias')}</td>
                                                <td className="p-2">{renderDateField(editingDriver.dataFimFerias, 'dataFimFerias')}</td>
                                                <td className="p-2"><input type="text" value={editingDriver.observacoes || ''} onChange={e => setEditingDriver({...editingDriver, observacoes: e.target.value})} className="w-full p-1 text-sm bg-slate-100 dark:bg-slate-700 rounded"/></td>
                                                <td className="p-2">
                                                    <button onClick={handleUpdateDriver} className="text-green-500 hover:text-green-700 mr-2">Salvar</button>
                                                    <button onClick={() => setEditingDriver(null)} className="text-slate-500 hover:text-slate-700">Cancelar</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-2 font-medium">{m.nome}</td>
                                                <td className="px-4 py-2"><span className={m.statusEmprego === 'ATIVO' ? 'text-green-500' : 'text-red-500'}>{m.statusEmprego}</span></td>
                                                <td className="px-4 py-2">{m.dataAdmissao ? (m.dataAdmissao as any).toDate().toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="px-4 py-2">{m.dataDemissao ? (m.dataDemissao as any).toDate().toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="px-4 py-2">{m.dataInicioFerias ? (m.dataInicioFerias as any).toDate().toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="px-4 py-2">{m.dataFimFerias ? (m.dataFimFerias as any).toDate().toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="px-4 py-2 truncate max-w-xs" title={m.observacoes}>{m.observacoes || '-'}</td>
                                                <td className="px-4 py-2">
                                                    <button onClick={() => setEditingDriver(m)} className="text-blue-500 hover:text-blue-700">Editar</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 </div>
            </div>
        </div>
    </section>
  );
};