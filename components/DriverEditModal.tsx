import React, { useState, useEffect } from 'react';
import { Motorista, Gestor } from '../types';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Save, X } from 'lucide-react';

interface DriverEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driver: Motorista) => void;
  driver: Motorista | null;
}

export const DriverEditModal: React.FC<DriverEditModalProps> = ({ isOpen, onClose, onSave, driver }) => {
  const [nome, setNome] = useState('');
  const [gestor, setGestor] = useState('');
  const [gestores, setGestores] = useState<Gestor[]>([]);
  
  useEffect(() => {
    if (driver) {
      setNome(driver.nome);
      setGestor(driver.gestor);
    } else {
      setNome('');
      setGestor('');
    }
  }, [driver]);
  
  useEffect(() => {
    const fetchGestores = async () => {
      const querySnapshot = await getDocs(collection(db, 'gestores'));
      const gestoresList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gestor));
      setGestores(gestoresList);
    };
    if (isOpen) {
      fetchGestores();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!nome.trim() || !gestor.trim()) {
      alert('Nome e gestor são obrigatórios.');
      return;
    }
    onSave({
      id: driver ? driver.id : '', // Let the parent handle new ID generation
      nome,
      gestor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {driver ? 'Editar Motorista' : 'Adicionar Motorista'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome do Motorista
            </label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="gestor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Gestor Responsável
            </label>
            <select
                id="gestor"
                value={gestor}
                onChange={(e) => setGestor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
                <option value="">-- Selecione um Gestor --</option>
                {gestores.map(g => (
                    <option key={g.id} value={g.nome}>{g.nome}</option>
                ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
