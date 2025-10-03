// Fix: Implemented the DriverRow component for displaying and managing a single daily control record.
import React, { useState } from 'react';
import { DailyControl } from '../types';
import { DRIVER_STATUSES } from '../constants';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { Save, Trash2 } from 'lucide-react';

interface DriverRowProps {
    control: DailyControl;
    onUpdate: (id: string, updatedControl: Partial<DailyControl>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const DriverRow: React.FC<DriverRowProps> = ({ control, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...control });

    const handleSave = async () => {
        if (JSON.stringify(editData) !== JSON.stringify(control)) {
            await onUpdate(control.id, {
                status: editData.status,
                observation: editData.observation,
            });
        }
        setIsEditing(false);
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return 'Data inválida';
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };
    
    return (
        <tr className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                {control.driverName}
            </th>
            <td className="px-6 py-4">
                {formatDate(control.date)}
            </td>
            <td className="px-6 py-4">
                {isEditing ? (
                    <SelectInput 
                        options={DRIVER_STATUSES}
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                    />
                ) : (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        control.status === 'Liberado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        control.status === 'Bloqueado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        control.status === 'Afastado' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                        {control.status}
                    </span>
                )}
            </td>
            <td className="px-6 py-4 max-w-sm">
                {isEditing ? (
                    <TextAreaInput
                         value={editData.observation}
                         onChange={(e) => setEditData({ ...editData, observation: e.target.value })}
                    />
                ) : (
                    <p className="truncate" title={control.observation}>{control.observation || '-'}</p>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                    {isEditing ? (
                        <button onClick={handleSave} className="font-medium text-blue-600 dark:text-blue-500 hover:underline" title="Salvar">
                            <Save className="h-5 w-5" />
                        </button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline" title="Editar">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                    )}
                    <button onClick={() => onDelete(control.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline" title="Excluir">
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
};
