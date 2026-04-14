"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientHome from "./ClientHome";
import { auth, hasFirebaseConfig } from "../lib/firebase";

export default function AuthGate() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!hasFirebaseConfig() || !auth) {
            router.replace("/login");
            setReady(true);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setReady(true);

            if (!nextUser) {
                router.replace("/login");
            }
        });

        return unsubscribe;
    }, [router]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
                Loading PantryPal...
            </div>
        );
    }

    if (!user) return null;

    return <ClientHome user={user} />;
}