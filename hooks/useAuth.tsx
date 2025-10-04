import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../firebase';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Gestor } from '../types';
import { LoginPage } from '../pages/LoginPage';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    gestorProfile: Gestor | null;
    authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [gestorProfile, setGestorProfile] = useState<Gestor | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            setAuthError(null);
            setUser(user);

            if (user && user.email) {
                 if (user.email === 'adm@adm.com') {
                    setGestorProfile(null); // Admin does not have a gestor profile
                } else {
                    try {
                        const gestorRef = doc(db, 'gestores', user.email);
                        const gestorSnap = await getDoc(gestorRef);
                        if (gestorSnap.exists() && gestorSnap.data().nome) {
                            const gestorData = { id: gestorSnap.id, ...gestorSnap.data() } as Gestor;
                            setGestorProfile(gestorData);
                        } else {
                            setGestorProfile(null);
                            setAuthError(`Perfil de gestor não encontrado ou mal configurado para o e-mail: ${user.email}. Verifique a coleção 'gestores' no Firebase.`);
                        }
                    } catch (error) {
                        console.error("Error fetching gestor profile:", error);
                        setGestorProfile(null);
                        setAuthError("Ocorreu um erro ao buscar o perfil do gestor.");
                    }
                }
            } else {
                setGestorProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        gestorProfile,
        authError
    };

    // O AppRouter agora cuidará de mostrar loading/error
    // Aqui, se não estiver carregando e não houver usuário, mostramos a página de login
    if (!loading && !user) {
        return <LoginPage />;
    }
    
    // Se estiver carregando, o AppRouter mostra a mensagem de carregamento.
    // Se houver um usuário ou erro, o AppRouter renderiza a página apropriada.
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};