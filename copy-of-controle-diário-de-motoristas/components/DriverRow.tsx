import React, { useState, useEffect, useRef } from 'react';
import type { Driver } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { GENERAL_STATUS_OPTIONS, TRIP_STATUS_OPTIONS, OVERTIME_OPTIONS } from '../constants';
import { CheckCircle, Trash2 } from 'lucide-react';

interface DriverRowProps {
  driver: Driver;
  onUpdate: (updatedDriver: Driver) => Promise<void>;
  onDelete: (driverId: string) => void;
}

type SavingStatus = 'idle' | 'saving' | 'saved';

export const DriverRow: React.FC<DriverRowProps> = ({ driver, onUpdate, onDelete }) => {
  const [updatedDriver, setUpdatedDriver] = useState<Driver>(driver);
  const [savingStatus, setSavingStatus] = useState<SavingStatus>('idle');
  const debounceTimeout = useRef<number | null>(null);

  // Sincroniza o estado local se a prop externa mudar
  useEffect(() => {
    setUpdatedDriver(driver);
  }, [driver]);

  const handleFieldChange = <K extends keyof Driver>(field: K, value: Driver[K]) => {
    setSavingStatus('saving');
    const newDriverState = { ...updatedDriver, [field]: value };
    setUpdatedDriver(newDriverState);

    // Limpa o timeout anterior para "debounce"
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Configura um novo timeout para salvar após 1 segundo de inatividade
    debounceTimeout.current = window.setTimeout(() => {
      onUpdate(newDriverState).then(() => {
        setSavingStatus('saved');
        // Volta para o estado 'idle' após mostrar "Salvo!" por 2 segundos
        setTimeout(() => setSavingStatus('idle'), 2000);
      });
    }, 1000);
  };
  
  const renderSavingStatus = () => {
    switch (savingStatus) {
        case 'saving':
            return <span className="text-xs text-amber-500">Salvando...</span>;
        case 'saved':
            return (
                <span className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle size={14} />
                    Salvo!
                </span>
            );
        default:
            return <span className="text-xs text-slate-400">-</span>;
    }
  };

  return (
    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50 transition-colors">
      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{driver.motorista}</td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{driver.gestor}</td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{new Date(driver.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
      <td className="px-6 py-4">
        <SelectInput
          value={updatedDriver.status}
          onChange={(e) => handleFieldChange('status', e.target.value)}
          options={GENERAL_STATUS_OPTIONS}
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          <SelectInput
            value={updatedDriver.alteracaoStatus}
            onChange={(e) => handleFieldChange('alteracaoStatus', e.target.value)}
            options={GENERAL_STATUS_OPTIONS}
          />
          <TextAreaInput
            value={updatedDriver.justificativaAlteracaoStatus}
            onChange={(e) => handleFieldChange('justificativaAlteracaoStatus', e.target.value)}
            placeholder="Justificativa..."
          />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          <SelectInput
            value={updatedDriver.statusViagem}
            onChange={(e) => handleFieldChange('statusViagem', e.target.value)}
            options={TRIP_STATUS_OPTIONS}
          />
          <TextAreaInput
            value={updatedDriver.justificativaStatusViagem}
            onChange={(e) => handleFieldChange('justificativaStatusViagem', e.target.value)}
            placeholder="Justificativa..."
          />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          <SelectInput
            value={updatedDriver.horaExtra}
            onChange={(e) => handleFieldChange('horaExtra', e.target.value)}
            options={OVERTIME_OPTIONS}
          />
          <TextAreaInput
            value={updatedDriver.justificativaHoraExtra}
            onChange={(e) => handleFieldChange('justificativaHoraExtra', e.target.value)}
            placeholder="Justificativa..."
          />
        </div>
      </td>
       <td className="px-6 py-4 align-middle text-center">
         {renderSavingStatus()}
       </td>
       <td className="px-6 py-4 align-middle text-center">
          <button 
            onClick={() => onDelete(driver.id)}
            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            aria-label="Excluir motorista"
            title="Excluir motorista"
          >
            <Trash2 size={18} />
          </button>
       </td>
    </tr>
  );
};