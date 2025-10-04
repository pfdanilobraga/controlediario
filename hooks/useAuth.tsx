import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Gestor } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    gestorProfile: Gestor | null;
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
                try {
                    const gestorRef = doc(db, 'gestores', user.email);
                    const gestorSnap = await getDoc(gestorRef);
                    if (gestorSnap.exists()) {
                        setGestorProfile({ id: gestorSnap.id, ...gestorSnap.data() } as Gestor);
                    } else {
                        setGestorProfile(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch gestor profile:", error);
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
        gestorProfile,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
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
