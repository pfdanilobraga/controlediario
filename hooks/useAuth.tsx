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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user && user.email) {
                // Fetch gestor profile
                try {
                    const gestorRef = doc(db, 'gestores', user.email);
                    const gestorSnap = await getDoc(gestorRef);
                    if (gestorSnap.exists()) {
                        setGestorProfile({ id: gestorSnap.id, ...gestorSnap.data() } as Gestor);
                    } else {
                        setGestorProfile(null);
                    }
                } catch (error) {
                    console.error("Error fetching gestor profile:", error);
                    setGestorProfile(null);
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
        gestorProfile
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {user ? children : <LoginPage />}
        </AuthContext.Provider>
    );
};
