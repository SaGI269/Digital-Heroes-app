import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import supabase from "../supabase";

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  if (loading) return <h2>Loading...</h2>;

  return session ? children : <Navigate to="/" />;
}