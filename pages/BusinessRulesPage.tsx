// Fix: Implemented the BusinessRulesPage with Gemini API integration for data analysis.
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { DailyLog } from '../types';
import { GoogleGenAI } from '@google/genai';
import { STATUS_GERAL_OPCOES, STATUS_VIAGEM_OPCOES, HORA_EXTRA_OPCOES } from '../constants';

// Per guideline: API key is obtained from process.env.API_KEY and its availability is assumed.
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export const BusinessRulesPage: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user) return;
            try {
                const logsCollection = collection(db, 'dailyLogs');
                const q = query(logsCollection, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                const logsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as DailyLog));
                setLogs(logsData);
            } catch (e) {
                console.error("Error fetching logs for analysis: ", e);
                setError("Falha ao buscar os dados dos motoristas.");
            }
        };

        fetchLogs();
    }, [user]);
    
    const generateAnalysis = async () => {
        if (!apiKey) {
            setError("A chave da API do Google GenAI não está configurada. Verifique as variáveis de ambiente.");
            return;
        }
        if (logs.length === 0) {
            setAnalysis("Não há dados de motoristas para analisar.");
            return;
        }

        setIsLoading(true);
        setAnalysis('');
        setError('');

        const logsSummary = logs.map(log => ({
            motorista: log.driverName,
            status_geral: log.statusGeral,
            status_viagem: log.statusViagem,
            hora_extra: log.horaExtra,
            observacao: log.observacao,
        }));

        const prompt = `
            Com base nos seguintes dados de controle diário de motoristas, forneça uma análise gerencial resumida em português.
            Destaque pontos de atenção, como motoristas com muitas horas extras autorizadas, motoristas inativos (folga, férias, atestado),
            e a distribuição geral dos status. Seja conciso, use tópicos (bullet points) e direto ao ponto.

            Dados:
            ${JSON.stringify(logsSummary, null, 2)}
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setAnalysis(response.text);
        } catch (err) {
            console.error("Error generating analysis: ", err);
            setError("Ocorreu um erro ao gerar a análise. Verifique o console para mais detalhes.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Regras de Negócio e Opções</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Status Geral</h3>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            {STATUS_GERAL_OPCOES.map(opt => <li key={opt}>{opt}</li>)}
                        </ul>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Status Viagem</h3>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            {STATUS_VIAGEM_OPCOES.map(opt => <li key={opt}>{opt}</li>)}
                        </ul>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Hora Extra</h3>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            {HORA_EXTRA_OPCOES.map(opt => <li key={opt}>{opt}</li>)}
                        </ul>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Análise com IA Gemini</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Clique no botão abaixo para gerar uma análise gerencial resumida da situação atual dos motoristas utilizando a IA do Google.
                </p>
                <button
                    onClick={generateAnalysis}
                    disabled={isLoading || logs.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Analisando...' : 'Gerar Análise'}
                </button>

                {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
                
                {analysis && (
                    <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Resultado da Análise:</h3>
                        <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">{analysis}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};
