import React, 'react';
import { useForm, Controller } from 'react-hook-form';
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

type FormData = Omit<Motorista, 'id' | 'dataAdmissao' | 'dataDemissao' | 'feriasInicio' | 'feriasFim'> & {
    dataAdmissao?: string;
    dataDemissao?: string;
    feriasInicio?: string;
    feriasFim?: string;
};


export const DriverEditModal: React.FC<DriverEditModalProps> = ({ isOpen, onClose, onSave, driver }) => {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      nome: driver?.nome || '',
      gestor: driver?.gestor || '',
      statusEmprego: driver?.statusEmprego || 'ATIVO',
      dataAdmissao: driver?.dataAdmissao ? new Date(driver.dataAdmissao).toISOString().split('T')[0] : '',
      dataDemissao: driver?.dataDemissao ? new Date(driver.dataDemissao).toISOString().split('T')[0] : '',
      feriasInicio: driver?.feriasInicio ? new Date(driver.feriasInicio).toISOString().split('T')[0] : '',
      feriasFim: driver?.feriasFim ? new Date(driver.feriasFim).toISOString().split('T')[0] : '',
      observacoes: driver?.observacoes || '',
    }
  });

  const [gestores, setGestores] = React.useState<Gestor[]>([]);
  const statusEmprego = watch('statusEmprego');

  React.useEffect(() => {
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

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      id: driver?.id || '',
      dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
      dataDemissao: data.dataDemissao ? new Date(data.dataDemissao) : null,
      feriasInicio: data.feriasInicio ? new Date(data.feriasInicio) : null,
      feriasFim: data.feriasFim ? new Date(data.feriasFim) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {driver ? 'Editar Motorista' : 'Adicionar Motorista'}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Motorista</label>
              <input {...register('nome', { required: 'Nome é obrigatório' })} className="w-full input-style" />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
            </div>
            
            <div>
              <label htmlFor="gestor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gestor Responsável</label>
              <select {...register('gestor', { required: 'Gestor é obrigatório' })} className="w-full input-style">
                <option value="">-- Selecione um Gestor --</option>
                {gestores.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
              </select>
               {errors.gestor && <p className="text-red-500 text-xs mt-1">{errors.gestor.message}</p>}
            </div>

            <div>
              <label htmlFor="statusEmprego" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select {...register('statusEmprego')} className="w-full input-style">
                <option value="ATIVO">ATIVO</option>
                <option value="DESLIGADO">DESLIGADO</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                <label htmlFor="dataAdmissao" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Admissão</label>
                <input type="date" {...register('dataAdmissao')} className="w-full input-style" />
              </div>
              <div>
                <label htmlFor="dataDemissao" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Demissão</label>
                <input type="date" {...register('dataDemissao')} className="w-full input-style" disabled={statusEmprego !== 'DESLIGADO'} />
              </div>
            </div>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                <label htmlFor="feriasInicio" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Início Férias</label>
                <input type="date" {...register('feriasInicio')} className="w-full input-style" />
              </div>
              <div>
                <label htmlFor="feriasFim" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fim Férias</label>
                <input type="date" {...register('feriasFim')} className="w-full input-style" />
              </div>
            </div>

             <div>
                <label htmlFor="observacoes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea {...register('observacoes')} rows={3} className="w-full input-style" />
            </div>

          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
