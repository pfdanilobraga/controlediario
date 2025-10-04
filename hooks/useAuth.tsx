import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Gestor } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    gestorProfile: Gestor | null;
    authError: string | null; // Novo estado para erros de perfil
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [gestorProfile, setGestorProfile] = useState<Gestor | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            setAuthError(null); // Limpa erros antigos ao mudar de usuário

            if (user && user.email) {
                 // O administrador não precisa de um perfil de gestor
                if (user.email === 'adm@adm.com') {
                    setGestorProfile(null);
                    setLoading(false);
                    return;
                }

                try {
                    const gestorRef = doc(db, 'gestores', user.email);
                    const gestorSnap = await getDoc(gestorRef);

                    if (gestorSnap.exists()) {
                        const gestorData = gestorSnap.data();
                        if (gestorData.nome && typeof gestorData.nome === 'string') {
                             setGestorProfile({ id: gestorSnap.id, ...gestorData } as Gestor);
                        } else {
                            setAuthError("Perfil de gestor encontrado, mas o campo 'nome' está faltando ou é inválido.");
                        }
                    } else {
                        setAuthError(`Perfil de gestor não encontrado para o e-mail: ${user.email}.`);
                    }
                } catch (error) {
                    console.error("Falha ao buscar perfil de gestor:", error);
                    setAuthError("Ocorreu um erro ao buscar as informações do seu perfil.");
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
        gestorProfile,
        authError,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
