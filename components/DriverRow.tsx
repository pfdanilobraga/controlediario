import React, { useState, useEffect } from 'react';
import { DailyRecord } from '../types';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HORA_EXTRA_OPCOES, STATUS_GERAL_OPCOES, STATUS_VIAGEM_OPCOES } from '../constants';
import { Save, Trash2, CheckCircle, X, Edit } from 'lucide-react';

interface DriverRowProps {
    record: DailyRecord;
}

export const DriverRow: React.FC<DriverRowProps> = ({ record }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedRecord, setEditedRecord] = useState<Partial<DailyRecord>>(record);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setEditedRecord(record);
        if (record.motorista === 'Novo Motorista') {
            setIsEditing(true);
        } else {
            setIsEditing(false);
        }
    }, [record]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedRecord(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const recordRef = doc(db, 'daily_records', record.id);
            const { id, ...dataToSave } = editedRecord;
            await updateDoc(recordRef, dataToSave);
            setIsEditing(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error("Error updating document: ", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (window.confirm(`Tem certeza que deseja excluir o registro de ${record.motorista}?`)) {
            try {
                await deleteDoc(doc(db, 'daily_records', record.id));
            } catch (error) {
                console.error("Error removing document: ", error);
            }
        }
    };

    const handleCancel = () => {
        setEditedRecord(record);
        setIsEditing(false);
    }

    // Helper to render justifications
    const renderJustifications = (isEditMode: boolean) => {
        if (!isEditMode) {
             const justs = [
                editedRecord.justificativaAlteracaoStatus,
                editedRecord.justificativaStatusViagem,
                editedRecord.justificativaHoraExtra
            ].filter(Boolean);
            return justs.length > 0 ? justs.join('; ') : <span className="text-slate-400">N/A</span>;
        }

        const fields = [];
         if (editedRecord.status && !['JORNADA', 'FOLGA EM CASA', 'FOLGA NA ESTRADA'].includes(editedRecord.status)) {
            fields.push(
                <div key="status" className="mt-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Justificativa Status</label>
                    <TextAreaInput 
                        name="justificativaAlteracaoStatus"
                        value={editedRecord.justificativaAlteracaoStatus || ''}
                        onChange={handleInputChange}
                        placeholder="Justificativa do status..."
                    />
                </div>
            );
        }
        if (editedRecord.statusViagem && editedRecord.statusViagem !== 'EM VIAGEM') {
             fields.push(
                <div key="viagem" className="mt-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Justificativa Viagem</label>
                    <TextAreaInput
                        name="justificativaStatusViagem"
                        value={editedRecord.justificativaStatusViagem || ''}
                        onChange={handleInputChange}
                        placeholder="Justificativa da viagem..."
                    />
                </div>
             );
        }
         if (editedRecord.horaExtra) {
             fields.push(
                <div key="horaExtra" className="mt-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Justificativa Hora Extra</label>
                    <TextAreaInput
                        name="justificativaHoraExtra"
                        value={editedRecord.justificativaHoraExtra || ''}
                        onChange={handleInputChange}
                        placeholder="Justificativa da hora extra..."
                    />
                </div>
             );
        }
        return fields.length > 0 ? fields : <span className="text-slate-400">Nenhuma justificativa necessária.</span>;
    }
    
    return (
        <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white align-top">
                {isEditing ? (
                    <input
                        type="text"
                        name="motorista"
                        value={editedRecord.motorista || ''}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    />
                ) : (
                    record.motorista
                )}
            </td>
            <td className="px-6 py-4 align-top">
                {isEditing ? (
                    <SelectInput 
                        name="status"
                        options={STATUS_GERAL_OPCOES}
                        value={editedRecord.status || ''}
                        onChange={handleInputChange}
                    />
                ) : (
                    editedRecord.status || <span className="text-slate-400">N/A</span>
                )}
            </td>
            <td className="px-6 py-4 align-top">
                {isEditing ? (
                    <SelectInput
                        name="statusViagem"
                        options={STATUS_VIAGEM_OPCOES}
                        value={editedRecord.statusViagem || ''}
                        onChange={handleInputChange}
                    />
                ) : (
                    editedRecord.statusViagem || <span className="text-slate-400">N/A</span>
                )}
            </td>
            <td className="px-6 py-4 align-top">
                {isEditing ? (
                    <SelectInput
                        name="horaExtra"
                        options={HORA_EXTRA_OPCOES}
                        value={editedRecord.horaExtra || ''}
                        onChange={handleInputChange}
                    />
                ) : (
                    editedRecord.horaExtra || <span className="text-slate-400">N/A</span>
                )}
            </td>
            <td className="px-6 py-4 align-top">
                {renderJustifications(isEditing)}
            </td>
            <td className="px-6 py-4 text-right space-x-1 align-top">
                {isEditing ? (
                    <>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-2 inline-flex items-center justify-center text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Salvar"
                        >
                            {isSaving ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-2 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            title="Cancelar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </>
                ) : (
                     <>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            title="Editar"
                        >
                            {showSuccess ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Edit className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 inline-flex items-center justify-center text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                            title="Excluir"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                     </>
                )}
            </td>
        </tr>
    );
};
