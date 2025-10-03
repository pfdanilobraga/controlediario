import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, Timestamp } from 'firebase/firestore';
import { Motorista, Gestor } from '../types';
import { DriverEditModal } from '../components/DriverEditModal';
import { PlusCircle, Trash2, Pencil, Save } from 'lucide-react';

export const DriverManagementPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Motorista[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Motorista | null>(null);

  // For batch add
  const [batchDriverNames, setBatchDriverNames] = useState('');
  const [batchSelectedGestor, setBatchSelectedGestor] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const driversSnapshot = await getDocs(collection(db, 'motoristas'));
      const driversList = driversSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            dataAdmissao: data.dataAdmissao ? (data.dataAdmissao as Timestamp).toDate() : null,
            dataDemissao: data.dataDemissao ? (data.dataDemissao as Timestamp).toDate() : null,
            feriasInicio: data.feriasInicio ? (data.feriasInicio as Timestamp).toDate() : null,
            feriasFim: data.feriasFim ? (data.feriasFim as Timestamp).toDate() : null,
        } as Motorista
      });

      const gestoresSnapshot = await getDocs(collection(db, 'gestores'));
      const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));

      setDrivers(driversList.sort((a,b) => a.nome.localeCompare(b.nome)));
      setGestores(gestoresList);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (driver: Motorista | null = null) => {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDriver(null);
  };

  const handleSaveDriver = async (driverData: Motorista) => {
    try {
      const dataToSave = {
        ...driverData,
        dataAdmissao: driverData.dataAdmissao ? Timestamp.fromDate(new Date(driverData.dataAdmissao)) : null,
        dataDemissao: driverData.dataDemissao ? Timestamp.fromDate(new Date(driverData.dataDemissao)) : null,
        feriasInicio: driverData.feriasInicio ? Timestamp.fromDate(new Date(driverData.feriasInicio)) : null,
        feriasFim: driverData.feriasFim ? Timestamp.fromDate(new Date(driverData.feriasFim)) : null,
      };

      if (driverData.id) { // Editing existing driver
        const driverRef = doc(db, 'motoristas', driverData.id);
        await updateDoc(driverRef, dataToSave);
      } else { // Adding new driver
        await addDoc(collection(db, 'motoristas'), dataToSave);
      }
      fetchData();
    } catch (error) {
      console.error("Error saving driver:", error);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (window.confirm(`Tem certeza que deseja excluir este motorista?`)) {
      try {
        await deleteDoc(doc(db, 'motoristas', driverId));
        fetchData();
      } catch (error) {
        console.error("Error deleting driver:", error);
      }
    }
  };
  
  const handleBatchAdd = async () => {
    const names = batchDriverNames.split('\n').map(name => name.trim()).filter(Boolean);
    if (names.length === 0 || !batchSelectedGestor) {
      alert("Por favor, insira nomes de motoristas e selecione um gestor.");
      return;
    }
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const newDriverRef = doc(collection(db, 'motoristas'));
        batch.set(newDriverRef, {
          nome: name,
          gestor: batchSelectedGestor,
          statusEmprego: 'ATIVO',
        });
      });
      await batch.commit();
      alert(`${names.length} motoristas adicionados com sucesso!`);
      setBatchDriverNames('');
      fetchData();
    } catch(err) {
      console.error("Error adding drivers in batch: ", err);
      alert("Falha ao adicionar motoristas.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
     if (!date) return 'N/A';
     return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
  }

  if (loading) {
    return <div className="text-center p-8">Carregando motoristas...</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Batch Add Section */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Motoristas em Lote</h3>
            <div className="space-y-4">
                <textarea 
                    rows={8}
                    value={batchDriverNames}
                    onChange={e => setBatchDriverNames(e.target.value)}
                    placeholder="Cole a lista de nomes, um por linha..."
                    className="w-full input-style"
                />
                <select 
                    value={batchSelectedGestor}
                    onChange={e => setBatchSelectedGestor(e.target.value)}
                    className="w-full input-style"
                >
                    <option value="">-- Atribuir ao Gestor --</option>
                    {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
                </select>
                <button
                    onClick={handleBatchAdd}
                    disabled={loading}
                    className="btn-primary w-full"
                >
                    <Save className="h-5 w-5" />
                    <span>Salvar Motoristas em Lote</span>
                </button>
            </div>
        </div>
        {/* Add Single Driver Section */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col justify-center items-center text-center">
            <h3 className="text-lg font-semibold mb-4">Adicionar Motorista Individual</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Para adicionar um motorista com todos os detalhes (datas, observações, etc.), use esta opção.</p>
            <button
              onClick={() => handleOpenModal()}
              className="btn-secondary"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Adicionar Motorista</span>
            </button>
        </div>
      </div>


      <h2 className="text-2xl font-semibold mb-6">Lista Mestra de Motoristas</h2>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                    <th scope="col" className="px-6 py-3">Nome</th>
                    <th scope="col" className="px-6 py-3">Gestor</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Admissão</th>
                    <th scope="col" className="px-6 py-3">Demissão</th>
                    <th scope="col" className="px-6 py-3">Férias</th>
                    <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                {drivers.map((driver) => (
                    <tr key={driver.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{driver.nome}</td>
                        <td className="px-6 py-4">{driver.gestor}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${driver.statusEmprego === 'ATIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                {driver.statusEmprego}
                            </span>
                        </td>
                        <td className="px-6 py-4">{formatDate(driver.dataAdmissao)}</td>
                        <td className="px-6 py-4">{formatDate(driver.dataDemissao)}</td>
                        <td className="px-6 py-4">{`${formatDate(driver.feriasInicio)} - ${formatDate(driver.feriasFim)}`}</td>
                        <td className="px-6 py-4 text-right space-x-4">
                            <button onClick={() => handleOpenModal(driver)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline" title="Editar"><Pencil className="h-5 w-5 inline" /></button>
                            <button onClick={() => handleDeleteDriver(driver.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline" title="Excluir"><Trash2 className="h-5 w-5 inline" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {isModalOpen && (
          <DriverEditModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveDriver}
            driver={selectedDriver}
          />
      )}
    </div>
  );
};
