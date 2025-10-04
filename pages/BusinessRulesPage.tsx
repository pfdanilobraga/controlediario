import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Motorista, Gestor } from '../types';
import { DriverEditModal } from '../components/DriverEditModal';
import { UserPlus, Search } from 'lucide-react';

export const DriverManagementPage: React.FC = () => {
    const [drivers, setDrivers] = useState<Motorista[]>([]);
    const [gestores, setGestores] = useState<Gestor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Motorista | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchDriversAndGestores = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch gestores
            const gestoresQuery = query(collection(db, 'gestores'), orderBy('nome'));
            const gestoresSnapshot = await getDocs(gestoresQuery);
            const gestoresList = gestoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
            setGestores(gestoresList);

            // Fetch drivers
            const driversQuery = query(collection(db, 'motoristas'), orderBy('nome'));
            const driversSnapshot = await getDocs(driversQuery);
            const driversList = driversSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    dataAdmissao: data.dataAdmissao?.toDate(),
                    dataDemissao: data.dataDemissao?.toDate(),
                    feriasInicio: data.feriasInicio?.toDate(),
                    feriasFim: data.feriasFim?.toDate(),
                } as Motorista;
            });
            setDrivers(driversList);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Falha ao carregar os dados. Tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDriversAndGestores();
    }, [fetchDriversAndGestores]);

    const handleSaveDriver = async (driverData: Motorista) => {
        try {
            let driverRef;
            let dataToSave = { ...driverData };

            if (driverData.id) {
                driverRef = doc(db, 'motoristas', driverData.id);
            } else {
                driverRef = doc(collection(db, 'motoristas'));
                dataToSave.id = driverRef.id; // Add the auto-generated ID
            }
            
            await setDoc(driverRef, dataToSave, { merge: true });
            setIsModalOpen(false);
            setSelectedDriver(null);
            fetchDriversAndGestores(); // Refresh data
        } catch (err) {
            console.error("Error saving driver:", err);
            setError("Falha ao salvar o motorista.");
        }
    };


    const handleAddNewDriver = () => {
        setSelectedDriver(null);
        setIsModalOpen(true);
    };

    const handleEditDriver = (driver: Motorista) => {
        setSelectedDriver(driver);
        setIsModalOpen(true);
    };

    const filteredDrivers = drivers.filter(driver =>
        driver.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.gestor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p className="text-center">Carregando motoristas...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Gerenciamento de Motoristas</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar motorista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleAddNewDriver}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors"
                    >
                        <UserPlus className="h-5 w-5" />
                        <span>Novo Motorista</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Gestor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Admissão</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Editar</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredDrivers.map(driver => (
                            <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{driver.nome}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{driver.gestor}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        driver.statusEmprego === 'ATIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                        {driver.statusEmprego}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    {driver.dataAdmissao ? new Date(driver.dataAdmissao).toLocaleDateString('pt-BR') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleEditDriver(driver)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <DriverEditModal
                    driver={selectedDriver}
                    gestores={gestores}
                    onSave={handleSaveDriver}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};
