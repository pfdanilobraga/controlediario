import React, { useState, useEffect } from 'react';
import { Motorista, Gestor } from '../types';
import { X } from 'lucide-react';

interface DriverEditModalProps {
  driver: Motorista | null;
  gestores: Gestor[];
  onSave: (driver: Motorista) => void;
  onClose: () => void;
}

export const DriverEditModal: React.FC<DriverEditModalProps> = ({ driver, gestores, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Motorista>>({
    nome: '',
    gestor: '',
    statusEmprego: 'ATIVO',
    dataAdmissao: null,
    dataDemissao: null,
    feriasInicio: null,
    feriasFim: null,
    observacoes: '',
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        ...driver,
        dataAdmissao: driver.dataAdmissao ? new Date(driver.dataAdmissao) : null,
        dataDemissao: driver.dataDemissao ? new Date(driver.dataDemissao) : null,
        feriasInicio: driver.feriasInicio ? new Date(driver.feriasInicio) : null,
        feriasFim: driver.feriasFim ? new Date(driver.feriasFim) : null,
      });
    } else {
      setFormData({
        nome: '',
        gestor: gestores.length > 0 ? gestores[0].nome : '',
        statusEmprego: 'ATIVO',
        dataAdmissao: new Date(),
        dataDemissao: null,
        feriasInicio: null,
        feriasFim: null,
        observacoes: '',
      });
    }
  }, [driver, gestores]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Handle empty date input
    if (value) {
        const date = new Date(value);
        // Adjust for timezone offset to store the correct date
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        setFormData(prev => ({ ...prev, [name]: date }));
    } else {
        setFormData(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.gestor) {
      alert('Nome e gestor são obrigatórios.');
      return;
    }
    const driverToSave: Motorista = {
      id: driver?.id || '', // Let parent component handle ID generation for new drivers
      nome: formData.nome!,
      gestor: formData.gestor!,
      statusEmprego: formData.statusEmprego!,
      dataAdmissao: formData.dataAdmissao || null,
      dataDemissao: formData.dataDemissao || null,
      feriasInicio: formData.feriasInicio || null,
      feriasFim: formData.feriasFim || null,
      observacoes: formData.observacoes || '',
    };
    onSave(driverToSave);
  };
  
  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold">{driver ? 'Editar Motorista' : 'Adicionar Novo Motorista'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                    <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"/>
                </div>
                <div>
                    <label htmlFor="gestor" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gestor Responsável</label>
                    <select name="gestor" id="gestor" value={formData.gestor} onChange={handleChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600">
                        {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="statusEmprego" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status do Emprego</label>
                    <select name="statusEmprego" id="statusEmprego" value={formData.statusEmprego} onChange={handleChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600">
                        <option value="ATIVO">ATIVO</option>
                        <option value="DESLIGADO">DESLIGADO</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="dataAdmissao" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data de Admissão</label>
                    <input type="date" name="dataAdmissao" id="dataAdmissao" value={formatDateForInput(formData.dataAdmissao)} onChange={handleDateChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"/>
                </div>
                <div>
                    <label htmlFor="dataDemissao" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data de Demissão</label>
                    <input type="date" name="dataDemissao" id="dataDemissao" value={formatDateForInput(formData.dataDemissao)} onChange={handleDateChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"/>
                </div>
                <div>
                    <label htmlFor="feriasInicio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Início das Férias</label>
                    <input type="date" name="feriasInicio" id="feriasInicio" value={formatDateForInput(formData.feriasInicio)} onChange={handleDateChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"/>
                </div>
                 <div>
                    <label htmlFor="feriasFim" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fim das Férias</label>
                    <input type="date" name="feriasFim" id="feriasFim" value={formatDateForInput(formData.feriasFim)} onChange={handleDateChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"/>
                </div>
            </div>
            <div>
                <label htmlFor="observacoes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Observações</label>
                <textarea name="observacoes" id="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"></textarea>
            </div>
          
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Salvar
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};
