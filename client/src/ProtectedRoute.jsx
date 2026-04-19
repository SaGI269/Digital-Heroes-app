import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import supabase from "../supabase";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) return <h2>Loading...</h2>;

  return user ? children : <Navigate to="/" />;
}
