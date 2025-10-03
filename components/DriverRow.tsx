// Fix: Implemented the DriverRow component to display and manage a single log entry.
import React from 'react';
import { DailyLog } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { HORA_EXTRA_OPCOES, STATUS_GERAL_OPCOES, STATUS_VIAGEM_OPCOES } from '../constants';
import { Save, Trash2 } from 'lucide-react';

interface DriverRowProps {
  log: DailyLog;
  onUpdate: (id: string, field: keyof Omit<DailyLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, value: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}

export const DriverRow: React.FC<DriverRowProps> = ({ log, onUpdate, onSave, onDelete, isSaving }) => {
  const handleInputChange = (field: keyof Omit<DailyLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, value: string) => {
    onUpdate(log.id, field, value);
  };

  const isJornada = log.statusGeral === 'JORNADA';

  return (
    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
      <td className="px-4 py-2">
        <input
          type="text"
          value={log.driverName}
          onChange={(e) => handleInputChange('driverName', e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition"
          placeholder="Nome do Motorista"
        />
      </td>
      <td className="px-4 py-2">
        <SelectInput
          options={STATUS_GERAL_OPCOES}
          value={log.statusGeral}
          onChange={(e) => handleInputChange('statusGeral', e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <SelectInput
          options={STATUS_VIAGEM_OPCOES}
          value={log.statusViagem || ''}
          onChange={(e) => handleInputChange('statusViagem', e.target.value)}
          disabled={!isJornada}
        />
      </td>
      <td className="px-4 py-2">
        <SelectInput
          options={HORA_EXTRA_OPCOES}
          value={log.horaExtra}
          onChange={(e) => handleInputChange('horaExtra', e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <TextAreaInput
          value={log.observacao}
          onChange={(e) => handleInputChange('observacao', e.target.value)}
          placeholder="Observações"
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onSave(log.id)}
            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Salvar alterações"
            disabled={isSaving}
          >
            <Save className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(log.id)}
            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Excluir registro"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
