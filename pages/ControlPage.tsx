import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { DriverRow } from '../components/DriverRow';
import { useAuth } from '../hooks/useAuth';
import { Search } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

// Helper to get date string in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDailyRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch active drivers
      let driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
      
      // Filter by manager if not an admin
      if (!isAdmin && gestorProfile) {
        driversQuery = query(driversQuery, where('gestor', '==', gestorProfile.nome));
      }
      
      const driversSnapshot = await getDocs(driversQuery);
      const drivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      
      // 2. For each driver, get or create today's record
      const today = new Date();
      const todayStr = getTodayDateString();

      const recordPromises = drivers.map(async (driver) => {
        const recordId = `${driver.id}_${todayStr}`;
        const recordRef = doc(db, 'dailyRecords', recordId);
        const recordSnap = await getDoc(recordRef);

        if (recordSnap.exists()) {
          const data = recordSnap.data();
          return { 
            id: recordId, 
            ...data,
            // Ensure date is a Date object if it's a Firestore Timestamp
            data: data.data?.toDate ? data.data.toDate() : today,
         } as DailyRecord;
        } else {
          // Create a default record for today
          return {
            id: recordId,
            motorista: driver.nome,
            data: today,
            gestor: driver.gestor,
            status: 'JORNADA',
            statusViagem: 'EM VIAGEM',
            horaExtra: 'NÃO AUTORIZADO',
            diasEmJornada: '0',
            lastModifiedBy: '',
          } as DailyRecord;
        }
      });
      
      const dailyRecords = await Promise.all(recordPromises);
      setRecords(dailyRecords.sort((a,b) => a.motorista.localeCompare(b.motorista)));

    } catch (error) {
      console.error("Error fetching daily records:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, gestorProfile]);

  useEffect(() => {
    fetchDailyRecords();
  }, [fetchDailyRecords]);

  const handleSaveRecord = async (record: DailyRecord) => {
    setSavingStates(prev => ({ ...prev, [record.id]: true }));
    try {
      const recordRef = doc(db, 'dailyRecords', record.id);
      
      const dataToSave = {
        ...record,
        data: new Date(), // Always save with current timestamp
      };
      delete (dataToSave as Partial<DailyRecord>).id; // Don't save the composite ID in the document body

      await setDoc(recordRef, dataToSave, { merge: true });

      // Update local state to reflect save
      setRecords(prevRecords => 
        prevRecords.map(r => (r.id === record.id ? record : r))
      );
    } catch (error) {
      console.error("Error saving record:", error);
    } finally {
      setSavingStates(prev => ({ ...prev, [record.id]: false }));
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    return records.filter(record => 
      record.motorista.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  if (loading) {
    return <div className="text-center p-8">Carregando controles do dia...</div>;
  }
  
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div>
           <h2 className="text-2xl font-semibold">Controle do Dia: {new Date().toLocaleDateString('pt-BR')}</h2>
           <p className="text-slate-500 dark:text-slate-400">
                {isAdmin ? 'Visualizando todos os motoristas.' : `Visualizando motoristas de ${gestorProfile?.nome}.`}
            </p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar motorista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <DriverRow 
              key={record.id}
              record={record}
              onSave={handleSaveRecord}
              isSaving={savingStates[record.id] || false}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <p className="text-slate-500 dark:text-slate-400">Nenhum motorista encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
