import React, { useState, useEffect } from 'react';
import { DailyRecord } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';
import { Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface DriverRowProps {
  record: DailyRecord;
  onSave: (record: DailyRecord) => Promise<void>;
  isSaving: boolean;
  isAdmin: boolean;
}

export const DriverRow: React.FC<DriverRowProps> = ({ record, onSave, isSaving, isAdmin }) => {
  const { user } = useAuth();
  const [localRecord, setLocalRecord] = useState<DailyRecord>(record);
  const [isModified, setIsModified] = useState(false);
  const [showJustification, setShowJustification] = useState({
    status: false,
    statusViagem: false,
    horaExtra: false,
    jornada: false,
  });

  useEffect(() => {
    setLocalRecord(record);
    setIsModified(false); // Reset modified state when props change
  }, [record]);
  
  useEffect(() => {
    // Logic to show justification fields
    const newShowJustification = {
        status: !['JORNADA', 'FOLGA EM CASA', 'FOLGA NA ESTRADA', ''].includes(localRecord.status),
        statusViagem: localRecord.statusViagem === 'EM CARREGAMENTO' || localRecord.statusViagem === 'EM DESCARGA',
        horaExtra: localRecord.horaExtra === 'AUTORIZADO',
        jornada: parseInt(localRecord.diasEmJornada || '0') >= 7,
    };
    setShowJustification(newShowJustification);
  }, [localRecord.status, localRecord.statusViagem, localRecord.horaExtra, localRecord.diasEmJornada]);


  const handleChange = (field: keyof DailyRecord, value: string) => {
    setLocalRecord(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };
  
  const handleSave = () => {
    if (!user?.email) return;
    const recordToSave = { ...localRecord, lastModifiedBy: user.email };
    onSave(recordToSave).then(() => {
        setIsModified(false);
    });
  };

  const hasBeenModifiedToday = record.lastModifiedBy && record.lastModifiedBy.length > 0;
  const inputStyle = "w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-4">
      {/* Driver Info */}
      <div className="md:col-span-2">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{record.motorista}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Gestor: {record.gestor}</p>
        {hasBeenModifiedToday && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400" title={`Salvo por ${record.lastModifiedBy}`}>
                <CheckCircle className="h-4 w-4" />
                <span>Salvo hoje</span>
            </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <SelectInput
            value={localRecord.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={STATUS_OPCOES}
          />
          {showJustification.status && (
             <TextAreaInput
                placeholder="Justificativa do Status"
                className="mt-2"
                value={localRecord.justificativaAlteracaoStatus || ''}
                onChange={(e) => handleChange('justificativaAlteracaoStatus', e.target.value)}
            />
          )}
        </div>
        
        {/* Status Viagem */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Viagem</label>
          <SelectInput
            value={localRecord.statusViagem}
            onChange={(e) => handleChange('statusViagem', e.target.value)}
            options={STATUS_VIAGEM_OPCOES}
            disabled={localRecord.status !== 'JORNADA'}
          />
          {showJustification.statusViagem && localRecord.status === 'JORNADA' && (
            <TextAreaInput
                placeholder="Justificativa da Viagem"
                className="mt-2"
                value={localRecord.justificativaStatusViagem || ''}
                onChange={(e) => handleChange('justificativaStatusViagem', e.target.value)}
            />
          )}
        </div>

        {/* Hora Extra */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hora Extra</label>
          <SelectInput
            value={localRecord.horaExtra}
            onChange={(e) => handleChange('horaExtra', e.target.value)}
            options={HORA_EXTRA_OPCOES}
            disabled={localRecord.status !== 'JORNADA'}
          />
           {showJustification.horaExtra && localRecord.status === 'JORNADA' && (
            <TextAreaInput
                placeholder="Justificativa da Hora Extra"
                className="mt-2"
                value={localRecord.justificativaHoraExtra || ''}
                onChange={(e) => handleChange('justificativaHoraExtra', e.target.value)}
            />
          )}
        </div>

        {/* Dias em Jornada */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dias em Jornada</label>
          <input
            type="number"
            min="0"
            className={inputStyle}
            value={localRecord.diasEmJornada || ''}
            onChange={(e) => handleChange('diasEmJornada', e.target.value)}
            disabled={localRecord.status !== 'JORNADA'}
          />
           {showJustification.jornada && localRecord.status === 'JORNADA' && (
             <TextAreaInput
                placeholder="Justificativa da Jornada"
                className="mt-2"
                value={localRecord.justificativaJornada || ''}
                onChange={(e) => handleChange('justificativaJornada', e.target.value)}
            />
          )}
        </div>
      </div>
      
      {/* Save Button */}
      <div className="md:col-span-1 flex items-center justify-end">
        <button
            onClick={handleSave}
            disabled={isSaving || !isModified}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isModified ? "Salvar alterações" : "Nenhuma alteração para salvar"}
        >
            <Save className="h-5 w-5" />
            <span className="hidden md:inline">Salvar</span>
        </button>
      </div>
    </div>
  );
};
