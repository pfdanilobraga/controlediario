import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Gestor } from '../types';

interface AuthContextType {
    user: User | null;
    gestorProfile: Gestor | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [gestorProfile, setGestorProfile] = useState<Gestor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user && user.email) {
                // Se o usuário for o admin, não buscamos perfil de gestor
                if (user.email === 'adm@adm.com') {
                    setGestorProfile(null);
                } else {
                    // Busca o perfil do gestor na coleção 'gestores'
                    const gestorDocRef = doc(db, 'gestores', user.email);
                    const gestorDocSnap = await getDoc(gestorDocRef);
                    if (gestorDocSnap.exists()) {
                        setGestorProfile({ id: gestorDocSnap.id, ...gestorDocSnap.data() } as Gestor);
                    } else {
                        console.warn(`Perfil de gestor não encontrado para: ${user.email}`);
                        setGestorProfile(null);
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

    const value = { user, gestorProfile, loading, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
