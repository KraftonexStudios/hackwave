import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);
        setUserType(user?.user_metadata?.user_type || "user");
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setCurrentUser(session?.user ?? null);
      setUserType(session?.user?.user_metadata?.user_type || "user");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { currentUser, userType, loading };
}
