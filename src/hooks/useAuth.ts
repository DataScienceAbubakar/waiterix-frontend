import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@/shared/schema";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "No user");
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          console.log("Sending token to backend...");
          const response = await apiRequest("POST", "/api/auth/verify", { idToken });
          console.log("Backend verification successful:", response);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } catch (error) {
          console.error("Backend verification failed:", error);
        }
      }
      setFirebaseInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: firebaseInitialized,
  });

  return {
    user,
    isLoading: userLoading || !firebaseInitialized,
    isAuthenticated: !!user,
  };
}
