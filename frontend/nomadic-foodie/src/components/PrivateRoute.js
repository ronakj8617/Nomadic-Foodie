import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseconfig';

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div className="text-center mt-5">Checking authentication...</div>;

  return user ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
