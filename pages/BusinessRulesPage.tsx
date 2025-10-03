// Fix: Implemented the BusinessRulesPage for data analysis using the Gemini API.
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyControl } from '../types';
import { FIRESTORE_COLLECTION } from '../constants';

export const BusinessRulesPage: React.FC = () => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [controls, setControls] = useState<DailyControl[]>([]);

    useEffect(() => {
        const fetchControls = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTION));
                const fetchedControls = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DailyControl[];
                setControls(fetchedControls);
            } catch (err) {
                console.error(err);
                setError('Falha ao carregar dados para análise.');
            }
        };
        fetchControls();
    }, []);

    const handleAnalyze = async () => {
        if (!process.env.API_KEY) {
            setError("Chave de API do Gemini não encontrada na variável de ambiente process.env.API_KEY.");
            return;
        }

        if (controls.length === 0) {
            setError("Não há dados suficientes para análise.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const controlsData = JSON.stringify(controls.map(({id, ...c}) => c), null, 2); // Remove ID for cleaner analysis
            const prompt = `
                Você é um especialista em logística e gestão de frotas.
                Analise os seguintes dados de controle diário de motoristas e forneça insights.
                Os dados estão em formato JSON.

                Dados:
                ${controlsData}

                Por favor, responda em português do Brasil com a seguinte estrutura:
                1.  **Resumo Geral:** Um resumo do status geral dos motoristas.
                2.  **Principais Pontos de Atenção:** Identifique os principais motivos para motoristas estarem "Bloqueado" ou "Afastado".
                3.  **Sugestões de Melhoria:** Com base na análise, sugira 1 ou 2 ações que a gestão pode tomar para melhorar a disponibilidade dos motoristas.

                Formate a sua resposta usando Markdown, especialmente títulos com negrito.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAnalysis(response.text);

        } catch (err) {
            console.error(err);
            setError('Ocorreu um erro ao realizar a análise com a IA. Verifique sua chave de API e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatApiResponse = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br />');
    };

    const analysisHtml = useMemo(() => analysis ? formatApiResponse(analysis) : '', [analysis]);
    
    return (
        <section>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-2">Análise de Dados com IA</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Clique no botão abaixo para usar a IA do Gemini para analisar os registros de controle diário e extrair insights valiosos.
                </p>
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || controls.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
                >
                    {isLoading ? 'Analisando...' : 'Analisar Dados'}
                </button>
            </div>

            {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
            
            {isLoading && (
                <div className="mt-8 text-center p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <p className="text-slate-600 dark:text-slate-400">Analisando dados... Isso pode levar alguns segundos.</p>
                </div>
            )}

            {analysis && (
                <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Resultado da Análise</h3>
                    <div
                        className="prose prose-slate dark:prose-invert max-w-none space-y-4"
                        dangerouslySetInnerHTML={{ __html: analysisHtml }}
                    />
                </div>
            )}
        </section>
    );
};
