import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Motorista } from '../types';
import { Trash2, UserPlus } from 'lucide-react';

export const DriverManagementPage: React.FC = () => {
    const [drivers, setDrivers] = useState<Motorista[]>([]);
    const [newDriverName, setNewDriverName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDrivers = async () => {
        setLoading(true);
        setError(null);
        try {
            const driversCollection = collection(db, 'motoristas');
            const driversSnapshot = await getDocs(driversCollection);
            const driversList = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
            setDrivers(driversList.sort((a, b) => a.nome.localeCompare(b.nome)));
        } catch (err) {
            console.error("Erro ao buscar motoristas: ", err);
            setError("Não foi possível carregar os motoristas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDriverName.trim()) {
            setError("O nome do motorista não pode estar vazio.");
            return;
        }
        setError(null);
        try {
            const driversCollection = collection(db, 'motoristas');
            await addDoc(driversCollection, { nome: newDriverName.trim() });
            setNewDriverName('');
            fetchDrivers(); // Refresh list
        } catch (err) {
            console.error("Erro ao adicionar motorista: ", err);
            setError("Falha ao adicionar novo motorista.");
        }
    };

    const handleDeleteDriver = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este motorista?')) {
            try {
                await deleteDoc(doc(db, 'motoristas', id));
                fetchDrivers(); // Refresh list
            } catch (err) {
                console.error("Erro ao excluir motorista: ", err);
                setError("Falha ao excluir motorista.");
            }
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Gerenciar Motoristas</h2>
            
            <form onSubmit={handleAddDriver} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <input
                    type="text"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="Nome do novo motorista"
                    className="flex-grow w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                <button
                    type="submit"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
                >
                    <UserPlus className="h-5 w-5" />
                    Adicionar
                </button>
            </form>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {loading ? (
                <p className="text-center text-slate-500 dark:text-slate-400">Carregando motoristas...</p>
            ) : (
                <div className="overflow-x-auto relative">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome do Motorista</th>
                                <th scope="col" className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(driver => (
                                <tr key={driver.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{driver.nome}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDeleteDriver(driver.id)} className="text-red-500 hover:text-red-700 p-1" title="Excluir Motorista">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {drivers.length === 0 && <p className="text-center py-4">Nenhum motorista cadastrado.</p>}
                </div>
            )}
        </div>
    );
};
