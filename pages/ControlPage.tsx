// Fix: Implemented the ControlPage for managing daily driver records with Firestore integration.
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyControl } from '../types';
import { DRIVER_STATUSES, FIRESTORE_COLLECTION } from '../constants';
import { DriverRow } from '../components/DriverRow';
import { SelectInput } from '../components/SelectInput';
import { TextAreaInput } from '../components/TextAreaInput';
import { PlusCircle, Search } from 'lucide-react';

export const ControlPage: React.FC = () => {
    const [controls, setControls] = useState<DailyControl[]>([]);
    const [filteredControls, setFilteredControls] = useState<DailyControl[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // New record form state
    const [newDriverName, setNewDriverName] = useState('');
    const [newStatus, setNewStatus] = useState(DRIVER_STATUSES[0]);
    const [newObservation, setNewObservation] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    const controlsCollectionRef = collection(db, FIRESTORE_COLLECTION);

    const fetchControls = async () => {
        try {
            setIsLoading(true);
            const q = query(controlsCollectionRef, orderBy('date', 'desc'));
            const data = await getDocs(q);
            const fetchedControls = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DailyControl[];
            setControls(fetchedControls);
            setFilteredControls(fetchedControls);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Falha ao buscar os controles. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchControls();
    }, []);

    useEffect(() => {
        const results = controls.filter(control =>
            control.driverName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredControls(results);
    }, [searchTerm, controls]);

    const handleAddControl = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDriverName.trim()) {
            alert('O nome do motorista é obrigatório.');
            return;
        }
        setIsAdding(true);
        try {
            const newControl = {
                driverName: newDriverName,
                status: newStatus,
                observation: newObservation,
                date: new Date().toISOString(),
            };
            await addDoc(controlsCollectionRef, newControl);
            setNewDriverName('');
            setNewStatus(DRIVER_STATUSES[0]);
            setNewObservation('');
            await fetchControls();
        } catch (err) {
            console.error(err);
            setError('Falha ao adicionar novo controle.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateControl = async (id: string, updatedControl: Partial<DailyControl>) => {
        const controlDoc = doc(db, FIRESTORE_COLLECTION, id);
        try {
            await updateDoc(controlDoc, updatedControl);
            await fetchControls();
        } catch (err) {
            console.error(err);
            setError('Falha ao atualizar o controle.');
        }
    };
    
    const handleDeleteControl = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
        const controlDoc = doc(db, FIRESTORE_COLLECTION, id);
        try {
            await deleteDoc(controlDoc);
            await fetchControls();
        } catch (err) {
            console.error(err);
            setError('Falha ao excluir o controle.');
        }
    };

    return (
        <section>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Adicionar Novo Controle</h2>
                <form onSubmit={handleAddControl} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="driverName" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Nome do Motorista</label>
                        <input
                            id="driverName"
                            type="text"
                            value={newDriverName}
                            onChange={(e) => setNewDriverName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition"
                            required
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="status" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Status</label>
                        <SelectInput
                            id="status"
                            options={DRIVER_STATUSES}
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as any)}
                            required
                        />
                    </div>
                     <div className="md:col-span-1">
                        <label htmlFor="observation" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Observação</label>
                        <TextAreaInput
                            id="observation"
                            value={newObservation}
                            onChange={(e) => setNewObservation(e.target.value)}
                            placeholder="Detalhes adicionais"
                        />
                    </div>
                    <button type="submit" disabled={isAdding} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition">
                        <PlusCircle className="h-5 w-5" />
                        {isAdding ? 'Adicionando...' : 'Adicionar'}
                    </button>
                </form>
            </div>

            <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold">Registros</h2>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition"
                        />
                     </div>
                </div>
               
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Motorista</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Observação</th>
                                <th scope="col" className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-4">Carregando...</td></tr>
                            ) : filteredControls.length > 0 ? (
                                filteredControls.map(control => (
                                    <DriverRow 
                                        key={control.id} 
                                        control={control}
                                        onUpdate={handleUpdateControl}
                                        onDelete={handleDeleteControl}
                                    />
                                ))
                            ) : (
                                <tr><td colSpan={5} className="text-center py-4">Nenhum registro encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};
