import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { DailyRecord, Motorista, Gestor } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DriverRow } from '../components/DriverRow';
import { Search } from 'lucide-react';

interface ControlPageProps {
  isAdmin: boolean;
  gestorProfile: Gestor | null;
}

export const ControlPage: React.FC<ControlPageProps> = ({ isAdmin, gestorProfile }) => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Motorista[]>([]);
  const [dailyRecords, setDailyRecords] = useState<Map<string, DailyRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const formatDateForFirestore = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDailyData = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      let driversQuery;
      if (isAdmin) {
        driversQuery = query(collection(db, 'motoristas'), where('statusEmprego', '==', 'ATIVO'));
      } else if (gestorProfile) {
        driversQuery = query(collection(db, 'motoristas'), where('gestor', '==', gestorProfile.nome), where('statusEmprego', '==', 'ATIVO'));
      } else {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const driversSnapshot = await getDocs(driversQuery);
      const driversList = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Motorista));
      driversList.sort((a, b) => a.nome.localeCompare(b.nome));
      setDrivers(driversList);

      if (driversList.length > 0) {
        const dateStr = formatDateForFirestore(date);
        const recordsQuery = query(collection(db, 'registrosDiarios'), where('data', '==', dateStr));
        const recordsSnapshot = await getDocs(recordsQuery);
        const recordsMap = new Map<string, DailyRecord>();
        recordsSnapshot.forEach(doc => {
          const data = doc.data();
          recordsMap.set(data.motoristaId, { id: doc.id, ...data, data: new Date(data.data) } as DailyRecord);
        });
        
        const today = new Date();
        const isToday = formatDateForFirestore(date) === formatDateForFirestore(today);

        const newRecords = new Map<string, DailyRecord>();
        driversList.forEach(driver => {
          if (recordsMap.has(driver.id)) {
            newRecords.set(driver.id, recordsMap.get(driver.id)!);
          } else if (isToday) {
            newRecords.set(driver.id, {
              id: `${dateStr}_${driver.id}`,
              motorista: driver.nome,
              data: date,
              gestor: driver.gestor,
              status: 'JORNADA',
              statusViagem: 'EM VIAGEM',
              horaExtra: 'NÃO AUTORIZADO',
            } as unknown as DailyRecord);
          }
        });
        setDailyRecords(newRecords);
      } else {
        setDailyRecords(new Map());
      }

    } catch (error) {
      console.error("Error fetching daily data:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, gestorProfile]);

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate, fetchDailyData]);

  const handleRecordChange = async (driverId: string, updatedFields: Partial<DailyRecord>) => {
    if (!user?.email) return;

    const currentRecord = dailyRecords.get(driverId);
    if (!currentRecord) return;
    
    const newRecord = { ...currentRecord, ...updatedFields, lastModifiedBy: user.email };
    setDailyRecords(new Map(dailyRecords.set(driverId, newRecord)));

    try {
      const dateStr = formatDateForFirestore(selectedDate);
      const docId = `${dateStr}_${driverId}`;
      const recordRef = doc(db, 'registrosDiarios', docId);
      
      const dataToSave = {
        ...currentRecord,
        ...updatedFields,
        data: dateStr,
        motoristaId: driverId,
        motorista: currentRecord.motorista,
        gestor: currentRecord.gestor,
        lastModifiedBy: user.email,
      };
      
      delete (dataToSave as any).id;

      await setDoc(recordRef, dataToSave, { merge: true });
    } catch (error) {
      console.error("Error saving daily record:", error);
      setDailyRecords(new Map(dailyRecords.set(driverId, currentRecord)));
    }
  };
  
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => 
      driver.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drivers, searchTerm]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    setSelectedDate(newDate);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar motorista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <input 
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8">Carregando...</div>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-6 py-3 min-w-[200px]">Motorista</th>
                <th scope="col" className="px-6 py-3 min-w-[150px]">Status</th>
                <th scope="col" className="px-6 py-3 min-w-[200px]">Justificativa Status</th>
                <th scope="col" className="px-6 py-3 min-w-[150px]">Status Viagem</th>
                <th scope="col" className="px-6 py-3 min-w-[200px]">Justificativa Viagem</th>
                <th scope="col" className="px-6 py-3 min-w-[150px]">Hora Extra</th>
                <th scope="col" className="px-6 py-3 min-w-[200px]">Justificativa H.E.</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => {
                const record = dailyRecords.get(driver.id);
                return record ? (
                  <DriverRow
                    key={driver.id}
                    driver={driver}
                    record={record}
                    onRecordChange={handleRecordChange}
                  />
                ) : null;
              })}
               {filteredDrivers.length === 0 && !loading && (
                    <tr>
                        <td colSpan={7} className="text-center p-8 bg-white dark:bg-slate-800">
                            Nenhum motorista encontrado.
                        </td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
