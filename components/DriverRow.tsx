import React, { useState, useEffect } from 'react';
import { Driver, DriverGeneralStatus, TripStatus, OvertimeStatus } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { GENERAL_STATUS_OPTIONS, TRIP_STATUS_OPTIONS, OVERTIME_OPTIONS } from '../constants';
import { Save, Trash2, CheckCircle } from 'lucide-react';

interface DriverRowProps {
  driver: Driver;
  onUpdate: (id: string, data: Partial<Omit<Driver, 'id' | 'createdAt' | 'name'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const DriverRow: React.FC<DriverRowProps> = ({ driver, onUpdate, onDelete }) => {
  const [localDriver, setLocalDriver] = useState<Driver>(driver);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setLocalDriver(driver);
  }, [driver]);

  const handleChange = (field: keyof Omit<Driver, 'id' | 'createdAt' | 'name'>, value: string) => {
    setLocalDriver(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const changes: Partial<Omit<Driver, 'id' | 'createdAt' | 'name'>> = {};
    if (localDriver.generalStatus !== driver.generalStatus) changes.generalStatus = localDriver.generalStatus;
    if (localDriver.tripStatus !== driver.tripStatus) changes.tripStatus = localDriver.tripStatus;
    if (localDriver.overtime !== driver.overtime) changes.overtime = localDriver.overtime;
    if (localDriver.notes !== driver.notes) changes.notes = localDriver.notes;
    
    if (Object.keys(changes).length > 0) {
      await onUpdate(driver.id, changes);
    }
    setIsSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };
  
  const isModified = localDriver.generalStatus !== driver.generalStatus ||
                     localDriver.tripStatus !== driver.tripStatus ||
                     localDriver.overtime !== driver.overtime ||
                     localDriver.notes !== driver.notes;

  return (
    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors duration-150">
      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
        {driver.name}
      </td>
      <td className="px-6 py-4 min-w-[150px]">
        <SelectInput
          options={GENERAL_STATUS_OPTIONS}
          value={localDriver.generalStatus}
          onChange={(e) => handleChange('generalStatus', e.target.value as DriverGeneralStatus)}
        />
      </td>
      <td className="px-6 py-4 min-w-[150px]">
        <SelectInput
          options={TRIP_STATUS_OPTIONS}
          value={localDriver.tripStatus}
          onChange={(e) => handleChange('tripStatus', e.target.value as TripStatus)}
        />
      </td>
      <td className="px-6 py-4 min-w-[150px]">
        <SelectInput
          options={OVERTIME_OPTIONS}
          value={localDriver.overtime}
          onChange={(e) => handleChange('overtime', e.target.value as OvertimeStatus)}
        />
      </td>
      <td className="px-6 py-4 min-w-[200px]">
        <TextAreaInput
          value={localDriver.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Adicionar observação..."
        />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className={`flex items-center justify-center gap-2 w-[100px] px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${
              isModified && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
            title={justSaved ? "Salvo!" : "Salvar alterações"}
          >
            {isSaving ? 'Salvando...' : justSaved ? <><CheckCircle className="h-4 w-4" /> Salvo</> : <><Save className="h-4 w-4" /> Salvar</>}
          </button>
          <button
            onClick={() => onDelete(driver.id)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800"
            title="Excluir motorista"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
