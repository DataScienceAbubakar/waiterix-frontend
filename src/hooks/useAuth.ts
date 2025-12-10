import { useQuery } from "@tanstack/react-query";
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
          const data = await response.json();
          console.log("Backend verification successful:", data);

          // Directly set the user data in the query cache instead of invalidating
          // This eliminates the race condition where the session cookie might not be ready
          if (data.user) {
            queryClient.setQueryData(["/api/auth/user"], data.user);
            console.log("User data set in cache:", data.user.id);
          }
        } catch (error) {
          console.error("Backend verification failed:", error);
          // Clear any stale user data if verification fails
          queryClient.setQueryData(["/api/auth/user"], null);
        }
      } else {
        // User signed out - clear the cache
        console.log("User signed out, clearing cache");
        queryClient.setQueryData(["/api/auth/user"], null);
      }
      setFirebaseInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: firebaseInitialized,
    // Custom query function that handles 401 gracefully
    queryFn: async () => {
      try {
        const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
        const res = await fetch(`${apiBaseUrl}/api/auth/user`, {
          credentials: "include",
        });

        if (res.status === 401) {
          // Not authenticated - return null instead of throwing
          console.log("User not authenticated (401), returning null");
          return null;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text}`);
        }

        return await res.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
  });

  return {
    user: user ?? undefined, // Convert null to undefined for compatibility
    isLoading: userLoading || !firebaseInitialized,
    isAuthenticated: !!user,
  };
}
