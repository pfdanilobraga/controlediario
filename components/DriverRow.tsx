import React, { useState, useEffect } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyRecord } from '../types';
import { useAuth } from '../hooks/useAuth';
import { SelectInput } from './SelectInput';
import { TextAreaInput } from './TextAreaInput';
import { STATUS_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';
import { Save, CheckCircle } from 'lucide-react';

interface DriverRowProps {
  record: DailyRecord;
  onUpdate: (record: DailyRecord) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({ record, onUpdate }) => {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [formData, setFormData] = useState<DailyRecord>(record);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setFormData(record);
        setIsDirty(false); // Reset dirty state when props change
    }, [record]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
        setIsSaved(false);
    };

    const handleSave = async () => {
        if (!user || !isDirty) return;
        setIsSaving(true);
        try {
            const recordToSave = {
                ...formData,
                lastModifiedBy: user.email,
                data: Timestamp.fromDate(new Date(formData.data))
            };
            const recordRef = doc(db, 'dailyRecords', record.id);
            await setDoc(recordRef, recordToSave);
            onUpdate(formData);
            setIsDirty(false);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000); // Hide confirmation after 2s
        } catch (error) {
            console.error("Error saving record:", error);
            // Handle error UI if needed
        } finally {
            setIsSaving(false);
        }
    };

    const needsJustification = (field: keyof DailyRecord, value: string) => {
        if (field === 'status' && value !== 'JORNADA' && value !== 'FOLGA NA ESTRADA' && value !== 'FOLGA EM CASA') return true;
        if (field === 'statusViagem' && value !== 'EM VIAGEM') return true;
        if (field === 'horaExtra' && value === 'AUTORIZADO') return true;
        return false;
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{formData.motorista}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestor: {formData.gestor}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 md:mt-0">
                    {isDirty && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    )}
                    {isSaved && (
                         <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-5 w-5" />
                            <span>Salvo!</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Placas */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Placas</label>
                    <input
                        type="text"
                        name="placas"
                        value={formData.placas || ''}
                        onChange={handleChange}
                        className="mt-1 w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition"
                    />
                </div>
                
                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                    <SelectInput name="status" options={STATUS_OPCOES} value={formData.status} onChange={handleChange} />
                    {needsJustification('status', formData.status) && (
                        <TextAreaInput name="justificativaAlteracaoStatus" placeholder="Justificativa para status" value={formData.justificativaAlteracaoStatus || ''} onChange={handleChange} className="mt-2" />
                    )}
                </div>

                {/* Status Viagem */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status da Viagem</label>
                    <SelectInput name="statusViagem" options={STATUS_VIAGEM_OPCOES} value={formData.statusViagem} onChange={handleChange} />
                    {needsJustification('statusViagem', formData.statusViagem) && (
                         <TextAreaInput name="justificativaStatusViagem" placeholder="Justificativa para status da viagem" value={formData.justificativaStatusViagem || ''} onChange={handleChange} className="mt-2" />
                    )}
                </div>

                 {/* Hora Extra */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hora Extra</label>
                    <SelectInput name="horaExtra" options={HORA_EXTRA_OPCOES} value={formData.horaExtra} onChange={handleChange} />
                    {needsJustification('horaExtra', formData.horaExtra) && (
                         <TextAreaInput name="justificativaHoraExtra" placeholder="Justificativa para hora extra" value={formData.justificativaHoraExtra || ''} onChange={handleChange} className="mt-2" />
                    )}
                </div>
            </div>
        </div>
    );
};
