// Fix: Implement the DriverManagementPage component to resolve module and content errors.
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { Gestor, Motorista } from '../types';
import { UserPlus } from 'lucide-react';

export const DriverManagementPage: React.FC = () => {
    const [gestores, setGestores] = useState<Gestor[]>([]);
    const [motoristas, setMotoristas] = useState<Motorista[]>([]);
    const [newGestorEmail, setNewGestorEmail] = useState('');
    const [newGestorName, setNewGestorName] = useState('');
    const [newDriverName, setNewDriverName] = useState('');
    const [selectedGestor, setSelectedGestor] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchGestores = async () => {
        const gestoresCollection = collection(db, 'gestores');
        const gestoresSnapshot = await getDocs(gestoresCollection);
        const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
        setGestores(gestoresList);
        if (gestoresList.length > 0 && !selectedGestor) {
            setSelectedGestor(gestoresList[0].id);
        }
    };
    
    const fetchMotoristas = async () => {
        const motoristasCollection = collection(db, 'motoristas');
        const motoristasSnapshot = await getDocs(motoristasCollection);
        const motoristasList = motoristasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
        setMotoristas(motoristasList);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                await fetchGestores();
                await fetchMotoristas();
            } catch (err) {
                console.error(err);
                setError('Falha ao carregar dados. Tente novamente mais tarde.');
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleAddGestor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGestorEmail || !newGestorName) {
            setError('Preencha o e-mail e o nome do gestor.');
            return;
        }
        setError('');
        try {
            const gestorRef = doc(db, 'gestores', newGestorEmail);
            const gestorSnap = await getDoc(gestorRef);
            if (gestorSnap.exists()) {
                setError('Já existe um gestor com este e-mail.');
                return;
            }
            await setDoc(gestorRef, { nome: newGestorName, motoristas: [] });
            setNewGestorEmail('');
            setNewGestorName('');
            fetchGestores();
        } catch (err) {
            console.error(err);
            setError('Falha ao adicionar gestor.');
        }
    };

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDriverName || !selectedGestor) {
            setError('Preencha o nome do motorista e selecione um gestor.');
            return;
        }
        setError('');
        try {
            // Add to motoristas collection
            await addDoc(collection(db, 'motoristas'), { nome: newDriverName, gestor: selectedGestor });
            
            // Add to gestor's motoristas array
            const gestorRef = doc(db, 'gestores', selectedGestor);
            const gestorSnap = await getDoc(gestorRef);
            if(gestorSnap.exists()) {
                const gestorData = gestorSnap.data() as Omit<Gestor, 'id'>;
                const updatedMotoristas = [...gestorData.motoristas, newDriverName];
                await setDoc(gestorRef, { ...gestorData, motoristas: updatedMotoristas });
            }

            setNewDriverName('');
            fetchMotoristas();
            fetchGestores(); // to update motoristas list in gestor
        } catch (err) {
            console.error(err);
            setError('Falha ao adicionar motorista.');
        }
    };


    if (loading) return <p className="text-center p-4">Carregando...</p>;

    return (
        <div className="space-y-8">
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            
            {/* Gerenciar Gestores */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">Gerenciar Gestores</h2>
                <form onSubmit={handleAddGestor} className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input
                        type="email"
                        value={newGestorEmail}
                        onChange={(e) => setNewGestorEmail(e.target.value)}
                        placeholder="E-mail do Gestor (login)"
                        className="flex-grow bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    />
                     <input
                        type="text"
                        value={newGestorName}
                        onChange={(e) => setNewGestorName(e.target.value)}
                        placeholder="Nome do Gestor"
                        className="flex-grow bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    />
                    <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                        <UserPlus className="h-5 w-5" /> Adicionar Gestor
                    </button>
                </form>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome</th>
                                <th scope="col" className="px-6 py-3">E-mail (Login)</th>
                                <th scope="col" className="px-6 py-3">Motoristas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gestores.map(g => (
                                <tr key={g.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{g.nome}</td>
                                    <td className="px-6 py-4">{g.id}</td>
                                    <td className="px-6 py-4">{g.motoristas.join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gerenciar Motoristas */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white">Gerenciar Motoristas</h2>
                <form onSubmit={handleAddDriver} className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input
                        type="text"
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        placeholder="Nome do Motorista"
                        className="flex-grow bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    />
                    <select
                        value={selectedGestor}
                        onChange={(e) => setSelectedGestor(e.target.value)}
                        className="flex-grow bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    >
                        <option value="">Selecione um Gestor</option>
                        {gestores.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                    <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                        <UserPlus className="h-5 w-5" /> Adicionar Motorista
                    </button>
                </form>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome do Motorista</th>
                                <th scope="col" className="px-6 py-3">Gestor Responsável</th>
                            </tr>
                        </thead>
                        <tbody>
                            {motoristas.map(m => (
                                <tr key={m.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{m.nome}</td>
                                    <td className="px-6 py-4">{gestores.find(g => g.id === m.gestor)?.nome || m.gestor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
