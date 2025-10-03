// Fix: Defined the DailyLog interface for type safety across the application.
import { Timestamp } from 'firebase/firestore';

export interface DailyLog {
  id: string;
  userId: string;
  driverName: string;
  statusGeral: string;
  statusViagem: string | null;
  horaExtra: string;
  observacao: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
