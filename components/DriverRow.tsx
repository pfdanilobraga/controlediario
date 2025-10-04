import React, { useState, useEffect } from 'react';
import { DailyRecord, Motorista } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';

interface DriverRowProps {
  driver: Motorista;
  record: DailyRecord;
  onRecordChange: (driverId: string, updatedRecord: Partial<DailyRecord>) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({ driver, record, onRecordChange }) => {
  const [currentRecord, setCurrentRecord] = useState(record);
  
  useEffect(() => {
    setCurrentRecord(record);
  }, [record]);

  const handleFieldChange = (field: keyof DailyRecord, value: any) => {
    const updatedRecordState = { ...currentRecord, [field]: value };
    const changes: Partial<DailyRecord> = { [field]: value };
    
    if (field === 'status' && !['ATESTADO', 'FALTA', 'SUSPENSÃO'].includes(value)) {
        if(currentRecord.justificativaAlteracaoStatus) {
            changes.justificativaAlteracaoStatus = '';
            updatedRecordState.justificativaAlteracaoStatus = '';
        }
    }
    if (field === 'statusViagem' && value === 'EM VIAGEM') {
        if (currentRecord.justificativaStatusViagem) {
            changes.justificativaStatusViagem = '';
            updatedRecordState.justificativaStatusViagem = '';
        }
    }
    if (field === 'horaExtra' && value === 'NÃO AUTORIZADO') {
        if (currentRecord.justificativaHoraExtra) {
            changes.justificativaHoraExtra = '';
            updatedRecordState.justificativaHoraExtra = '';
        }
    }
    
    setCurrentRecord(updatedRecordState);
    onRecordChange(driver.id, changes);
  };
  
  const requiresJustification = (field: 'status' | 'statusViagem' | 'horaExtra', value: string) => {
    switch (field) {
        case 'status':
            return ['ATESTADO', 'FALTA', 'SUSPENSÃO'].includes(value);
        case 'statusViagem':
            return value !== 'EM VIAGEM';
        case 'horaExtra':
            return value === 'AUTORIZADO';
        default:
            return false;
    }
  }

  return (
    <tr className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
        {driver.nome}
      </td>
      <td className="px-6 py-4">
        <SelectInput
          value={currentRecord.status || ''}
          onChange={(e) => handleFieldChange('status', e.target.value)}
          options={STATUS_OPCOES}
        />
      </td>
      <td className="px-6 py-4">
        {requiresJustification('status', currentRecord.status) && (
          <TextAreaInput
            placeholder="Justificativa..."
            value={currentRecord.justificativaAlteracaoStatus || ''}
            onChange={(e) => handleFieldChange('justificativaAlteracaoStatus', e.target.value)}
          />
        )}
      </td>
      <td className="px-6 py-4">
        <SelectInput
          value={currentRecord.statusViagem || ''}
          onChange={(e) => handleFieldChange('statusViagem', e.target.value)}
          options={STATUS_VIAGEM_OPCOES}
        />
      </td>
      <td className="px-6 py-4">
        {requiresJustification('statusViagem', currentRecord.statusViagem) && (
          <TextAreaInput
            placeholder="Justificativa..."
            value={currentRecord.justificativaStatusViagem || ''}
            onChange={(e) => handleFieldChange('justificativaStatusViagem', e.target.value)}
          />
        )}
      </td>
      <td className="px-6 py-4">
        <SelectInput
          value={currentRecord.horaExtra || ''}
          onChange={(e) => handleFieldChange('horaExtra', e.target.value)}
          options={HORA_EXTRA_OPCOES}
        />
      </td>
      <td className="px-6 py-4">
        {requiresJustification('horaExtra', currentRecord.horaExtra) && (
          <TextAreaInput
            placeholder="Justificativa..."
            value={currentRecord.justificativaHoraExtra || ''}
            onChange={(e) => handleFieldChange('justificativaHoraExtra', e.target.value)}
          />
        )}
      </td>
    </tr>
  );
};
