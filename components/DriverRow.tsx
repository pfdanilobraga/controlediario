import React from 'react';
import { DailyRecord } from '../types';
import { SelectInput } from './SelectInput';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';
import { Trash2 } from 'lucide-react';

interface DriverRowProps {
  record: DailyRecord;
  onUpdate: (id: string, field: keyof DailyRecord, value: any) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

export const DriverRow: React.FC<DriverRowProps> = ({ record, onUpdate, onDelete, isAdmin }) => {
  const handleChange = (field: keyof DailyRecord, value: any) => {
    onUpdate(record.id, field, value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  return (
    <tr className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm">
      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white whitespace-nowrap" style={{ minWidth: '200px' }}>
        {record.motorista}
      </td>
      <td className="px-3 py-2">{formatDate(record.data)}</td>
      <td className="px-3 py-2">{record.gestor}</td>
      <td className="px-3 py-2" style={{ minWidth: '150px' }}>
        <input
          type="text"
          value={record.placas || ''}
          onChange={(e) => handleChange('placas', e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </td>
      <td className="px-3 py-2" style={{ minWidth: '180px' }}>
        <SelectInput
          options={STATUS_OPCOES}
          value={record.status}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </td>
       <td className="px-3 py-2" style={{ minWidth: '180px' }}>
        <SelectInput
          options={STATUS_VIAGEM_OPCOES}
          value={record.statusViagem}
          onChange={(e) => handleChange('statusViagem', e.target.value)}
        />
      </td>
      <td className="px-3 py-2" style={{ minWidth: '180px' }}>
        <SelectInput
          options={HORA_EXTRA_OPCOES}
          value={record.horaExtra}
          onChange={(e) => handleChange('horaExtra', e.target.value)}
        />
      </td>
       <td className="px-3 py-2" style={{ minWidth: '150px' }}>
        <input
          type="text"
          value={record.diasEmJornada || ''}
          onChange={(e) => handleChange('diasEmJornada', e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </td>
      <td className="px-3 py-2" style={{ minWidth: '250px' }}>
        <textarea
          value={record.justificativaJornada || ''}
          onChange={(e) => handleChange('justificativaJornada', e.target.value)}
          rows={1}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </td>
      <td className="px-3 py-2">
        {isAdmin && (
          <button onClick={() => onDelete(record.id)} className="text-red-500 hover:text-red-700 p-1" title="Excluir Registro">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </td>
    </tr>
  );
};
