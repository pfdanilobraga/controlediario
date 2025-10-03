import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// As credenciais do Firebase agora são lidas de forma segura das Variáveis de Ambiente.
// Você precisará configurar estas variáveis na sua plataforma de hospedagem (Vercel).
// IMPORTANTE: O nome de cada variável DEVE começar com "VITE_".

// Fix: Replaced `import.meta.env` with `process.env` to resolve TypeScript errors.
// Bundlers like Vite replace `process.env.VITE_*` with the corresponding values at build time,
// making it a safe and compatible way to access environment variables on the client.
const firebaseConfig = {
  apiKey: process.env.VITE_API_KEY,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID,
  measurementId: process.env.VITE_MEASUREMENT_ID
};

// Validação para garantir que as variáveis de ambiente foram carregadas
if (!firebaseConfig.apiKey) {
    throw new Error("Configuração do Firebase não encontrada. Verifique suas variáveis de ambiente.");
}

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias dos serviços do Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);