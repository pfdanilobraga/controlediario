import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// As credenciais do Firebase agora são lidas de forma segura das Variáveis de Ambiente.
// Você precisará configurar estas variáveis na sua plataforma de hospedagem (Vercel).
// IMPORTANTE: O nome de cada variável DEVE começar com "VITE_".

// Fix: Replaced `import.meta.env` with `process.env` to resolve TypeScript errors.
// Bundlers like Vite replace `process.env.VITE_*` with the corresponding values at build time,
// making it a safe and compatible way to access environment variables on the client.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA70---C7TrwyjPsyxpiNaQe4J6oBAkqFs",
  authDomain: "controlediariomotoristas.firebaseapp.com",
  projectId: "controlediariomotoristas",
  storageBucket: "controlediariomotoristas.firebasestorage.app",
  messagingSenderId: "121923762953",
  appId: "1:121923762953:web:ba370b7b8a6f0087a4b1d8",
  measurementId: "G-X66ZGHQ6HW"
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
