import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, runTransaction, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Motorista, Gestor } from '../types';
import { DriverEditModal } from '../components/DriverEditModal';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';

export const DriverManagementPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Motorista | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'motoristas'));
      const driversList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      setDrivers(driversList);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

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
      if (selectedDriver) { // Editing existing driver
        const oldGestorName = selectedDriver.gestor;
        const newGestorName = driverData.gestor;
        const driverRef = doc(db, 'motoristas', selectedDriver.id);

        await runTransaction(db, async (transaction) => {
            transaction.update(driverRef, { nome: driverData.nome, gestor: driverData.gestor });

            if (oldGestorName !== newGestorName) {
                const gestoresRef = collection(db, 'gestores');

                const oldGestorQuery = query(gestoresRef, where("nome", "==", oldGestorName));
                const oldGestorSnapshot = await getDocs(oldGestorQuery);
                const oldGestorDoc = oldGestorSnapshot.docs[0];
                
                const newGestorQuery = query(gestoresRef, where("nome", "==", newGestorName));
                const newGestorSnapshot = await getDocs(newGestorQuery);
                const newGestorDoc = newGestorSnapshot.docs[0];

                if(oldGestorDoc) {
                    transaction.update(doc(db, 'gestores', oldGestorDoc.id), { motoristas: arrayRemove(driverData.nome) });
                }
                if(newGestorDoc) {
                    transaction.update(doc(db, 'gestores', newGestorDoc.id), { motoristas: arrayUnion(driverData.nome) });
                }
            }
        });
      } else { // Adding new driver
        await addDoc(collection(db, 'motoristas'), { nome: driverData.nome, gestor: driverData.gestor });

        const gestoresRef = collection(db, 'gestores');
        const q = query(gestoresRef, where("nome", "==", driverData.gestor));
        const gestorSnapshot = await getDocs(q);
        const gestorDoc = gestorSnapshot.docs[0];
        if (gestorDoc) {
            await updateDoc(doc(db, 'gestores', gestorDoc.id), {
                motoristas: arrayUnion(driverData.nome)
            });
        }
      }
      fetchDrivers();
    } catch (error) {
      console.error("Error saving driver:", error);
    }
  };

  const handleDeleteDriver = async (driver: Motorista) => {
    if (window.confirm(`Tem certeza que deseja excluir ${driver.nome}?`)) {
      try {
        await runTransaction(db, async (transaction) => {
            const driverRef = doc(db, 'motoristas', driver.id);
            transaction.delete(driverRef);

            const gestoresRef = collection(db, 'gestores');
            const q = query(gestoresRef, where("nome", "==", driver.gestor));
            const gestorSnapshot = await getDocs(q);
            const gestorDoc = gestorSnapshot.docs[0];

            if (gestorDoc) {
                transaction.update(doc(db, 'gestores', gestorDoc.id), { motoristas: arrayRemove(driver.nome) });
            }
        });
        fetchDrivers();
      } catch (error) {
        console.error("Error deleting driver:", error);
      }
    }
  };

  if (loading) {
    return <div className="text-center p-8">Carregando motoristas...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Motoristas</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Adicionar Motorista</span>
        </button>
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                    <th scope="col" className="px-6 py-3">Nome</th>
                    <th scope="col" className="px-6 py-3">Gestor Responsável</th>
                    <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                {drivers.map((driver) => (
                    <tr key={driver.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{driver.nome}</td>
                        <td className="px-6 py-4">{driver.gestor}</td>
                        <td className="px-6 py-4 text-right space-x-4">
                            <button onClick={() => handleOpenModal(driver)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline"><Pencil className="h-5 w-5 inline" /></button>
                            <button onClick={() => handleDeleteDriver(driver)} className="font-medium text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-5 w-5 inline" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <DriverEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDriver}
        driver={selectedDriver}
      />
    </div>
  );
};
