import React from 'react';
import { DailyRecord } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { STATUS_GERAL_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';

interface DriverRowProps {
  record: DailyRecord;
  onUpdate: (updatedRecord: DailyRecord) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({ record, onUpdate }) => {
  
  const handleChange = (field: keyof Omit<DailyRecord, 'id' | 'data'>, value: string) => {
    onUpdate({ ...record, [field]: value });
  };

  return (
    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors duration-150">
      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10">
        {record.motorista}
      </td>
      <td className="px-4 py-2">{record.gestor}</td>
      <td className="px-4 py-2">{record.placas}</td>
      <td className="px-4 py-2 min-w-[200px]">
        <SelectInput
          options={STATUS_GERAL_OPCOES}
          value={record.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </td>
      <td className="px-4 py-2 min-w-[200px]">
        <SelectInput
          options={STATUS_GERAL_OPCOES}
          value={record.alteracaoStatus || ''}
          onChange={(e) => handleChange('alteracaoStatus', e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <TextAreaInput
          value={record.justificativaAlteracaoStatus || ''}
          onChange={(e) => handleChange('justificativaAlteracaoStatus', e.target.value)}
          placeholder="Justificativa..."
        />
      </td>
      <td className="px-4 py-2 min-w-[200px]">
        <SelectInput
          options={STATUS_VIAGEM_OPCOES}
          value={record.statusViagem || ''}
          onChange={(e) => handleChange('statusViagem', e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <TextAreaInput
          value={record.justificativaStatusViagem || ''}
          onChange={(e) => handleChange('justificativaStatusViagem', e.target.value)}
          placeholder="Justificativa..."
        />
      </td>
      <td className="px-4 py-2 min-w-[200px]">
        <SelectInput
          options={HORA_EXTRA_OPCOES}
          value={record.horaExtra || ''}
          onChange={(e) => handleChange('horaExtra', e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <TextAreaInput
          value={record.justificativaHoraExtra || ''}
          onChange={(e) => handleChange('justificativaHoraExtra', e.target.value)}
          placeholder="Justificativa..."
        />
      </td>
    </tr>
  );
};
