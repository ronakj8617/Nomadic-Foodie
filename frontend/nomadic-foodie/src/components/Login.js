import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../firebaseconfig';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseconfig'; // Make sure this points to your Firestore instance
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import loadScript from 'load-script';

function Login() {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();


  // useEffect(() => {
  //   const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  //   if (!window.google) {
  //     loadScript(
  //       `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`,
  //       (err, script) => {
  //         if (err) {
  //           console.error('Google Maps script load error:', err);
  //         } else {
  //           console.log('✅ Google Maps Places API loaded');
  //         }
  //       }
  //     );
  //   }
  // }, []);


  const handleChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const goToSignUp = () => {
    navigate('/registration');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );

      const uid = userCredential.user.uid;

      // Check both collections
      const restaurantDocRef = doc(db, 'restaurantDetails', uid);
      const userDocRef = doc(db, 'userDetails', uid);

      const [restaurantSnap, userSnap] = await Promise.all([
        getDoc(restaurantDocRef),
        getDoc(userDocRef)
      ]);

      if (restaurantSnap.exists()) {
        const data = restaurantSnap.data();
        if (data.role === 'restaurant') {
          alert("Logged in as restaurant!");
          navigate('/restauranthome');
          return;
        }
      }

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.role === 'foodie') {
          alert("Logged in as foodie!");
          navigate('/userhome');
          return;
        }
      }

      // Fallback if no valid role found
      alert("No valid account role found. Please contact support.");
    } catch (error) {
      console.error("Login error:", error.message);
      alert("Login failed: " + error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      alert("Please enter your email to reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, loginData.email);
      alert("Password reset email sent!");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;

      // Fetch from both possible collections
      const restaurantDocRef = doc(db, 'restaurantDetails', uid);
      const userDocRef = doc(db, 'userDetails', uid);

      const [restaurantSnap, userSnap] = await Promise.all([
        getDoc(restaurantDocRef),
        getDoc(userDocRef)
      ]);

      if (restaurantSnap.exists()) {
        const data = restaurantSnap.data();
        if (data.role === 'restaurant') {
          alert("Logged in as restaurant!");
          navigate('/restauranthome');
          return;
        }
      }

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.role === 'foodie') {
          alert("Logged in as foodie!");
          navigate('/userhome');
          return;
        }
      }

      alert("Google account not registered with a valid role.");
    } catch (error) {
      alert("Google login failed: " + error.message);
    }
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;

        const restaurantDocRef = doc(db, 'restaurantDetails', uid);
        const userDocRef = doc(db, 'userDetails', uid);

        const [restaurantSnap, userSnap] = await Promise.all([
          getDoc(restaurantDocRef),
          getDoc(userDocRef)
        ]);

        if (restaurantSnap.exists()) {
          const data = restaurantSnap.data();
          if (data.role === 'restaurant') {
            navigate('/restauranthome');
            return;
          }
        }

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.role === 'foodie') {
            navigate('/userhome');
            return;
          }
        }

        // If no role found, you may choose to sign them out
        // await auth.signOut();
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%', backgroundColor: '#fff', border: '1px solid #000' }}>
        <h3 className="text-center mb-4 text-dark">Login</h3>
        <form onSubmit={handleLogin}>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Email</label>
            <input
              type="email"
              name="email"
              value={loginData.email}
              onChange={handleChange}
              className="form-control border-dark text-dark bg-light"
              required
            />
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Password</label>
            <input
              type="password"
              name="password"
              value={loginData.password}
              onChange={handleChange}
              className="form-control border-dark text-dark bg-light"
              required
            />
          </div>
          <div className="form-check mb-3 text-start">
            <input
              className="form-check-input"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              id="rememberMeCheck"
            />
            <label className="form-check-label text-dark" htmlFor="rememberMeCheck">
              Remember Me
            </label>
          </div>
          <div className="d-grid mb-2">
            <button type="submit" className="btn btn-dark">Login</button>
          </div>
        </form>

        <button className="btn btn-link text-dark p-0 mb-3" onClick={handleForgotPassword}>
          Forgot Password?
        </button>
        <button className="btn btn-link text-dark p-0 mb-3" onClick={goToSignUp}>
          Sign Up
        </button>

        <hr />
        <button className="btn btn-outline-dark w-100" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
