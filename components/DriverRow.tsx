import React from 'react';
import { DailyRecord } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HORA_EXTRA_OPCOES, STATUS_GERAL_OPCOES, STATUS_VIAGEM_OPCOES } from '../constants';
import { Trash2 } from 'lucide-react';

interface DriverRowProps {
    record: DailyRecord;
    onUpdate: (updatedRecord: DailyRecord) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({ record, onUpdate }) => {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        onUpdate({ ...record, [name]: value });
    };

    const handleDelete = async () => {
        if (window.confirm(`Tem certeza que deseja excluir o registro de ${record.motorista} em ${record.data.toLocaleDateString()}?`)) {
            try {
                await deleteDoc(doc(db, 'daily_records', record.id));
            } catch (error) {
                console.error("Error removing document: ", error);
                alert("Ocorreu um erro ao excluir o registro.");
            }
        }
    };
    
    return (
        <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 align-top">
            {/* Motorista */}
            <td className="px-2 py-2">
                <input
                    type="text"
                    name="motorista"
                    value={record.motorista || ''}
                    onChange={handleInputChange}
                    className="w-full form-input"
                />
            </td>
            {/* Data */}
            <td className="px-2 py-2 text-xs whitespace-nowrap">
                {record.data.toLocaleDateString()}
            </td>
            {/* Placas */}
            <td className="px-2 py-2">
                 <input
                    type="text"
                    name="placas"
                    value={record.placas || ''}
                    onChange={handleInputChange}
                    className="w-24 form-input"
                />
            </td>
            {/* Status */}
            <td className="px-2 py-2">
                <SelectInput 
                    name="status"
                    options={STATUS_GERAL_OPCOES}
                    value={record.status || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Alt. Status */}
            <td className="px-2 py-2">
                <SelectInput 
                    name="alteracaoStatus"
                    options={STATUS_GERAL_OPCOES}
                    value={record.alteracaoStatus || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Just. Alt. Status */}
            <td className="px-2 py-2">
                <TextAreaInput
                    name="justificativaAlteracaoStatus"
                    value={record.justificativaAlteracaoStatus || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Status Viagem */}
            <td className="px-2 py-2">
                <SelectInput
                    name="statusViagem"
                    options={STATUS_VIAGEM_OPCOES}
                    value={record.statusViagem || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Just. Status Viagem */}
             <td className="px-2 py-2">
                <TextAreaInput
                    name="justificativaStatusViagem"
                    value={record.justificativaStatusViagem || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Hora Extra */}
            <td className="px-2 py-2">
                <SelectInput
                    name="horaExtra"
                    options={HORA_EXTRA_OPCOES}
                    value={record.horaExtra || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Just. Hora Extra */}
            <td className="px-2 py-2">
                <TextAreaInput
                    name="justificativaHoraExtra"
                    value={record.justificativaHoraExtra || ''}
                    onChange={handleInputChange}
                />
            </td>
            {/* Ações */}
            <td className="px-2 py-2">
                <button
                    onClick={handleDelete}
                    className="p-2 inline-flex items-center justify-center text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                    title="Excluir Registro"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </td>
             <style>{`
                .form-input {
                    width: 100%;
                    padding: 0.5rem;
                    border-radius: 0.375rem;
                    border: 1px solid #cbd5e1;
                    background-color: #f8fafc;
                     font-size: 0.875rem;
                }
                .dark .form-input {
                    border-color: #475569;
                    background-color: #334155;
                    color: #e2e8f0;
                }
                 select.form-input {
                    padding-right: 2rem; /* space for dropdown arrow */
                }
            `}</style>
        </tr>
    );
};