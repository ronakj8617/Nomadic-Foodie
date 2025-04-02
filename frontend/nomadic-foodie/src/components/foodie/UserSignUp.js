import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, db } from '../../firebaseconfig';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import cuisinesData from './cuisines.json';

function UserSignUp() {
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '',
    city: '',
    contact: '',
    priceLevel: '' 
  });

  const navigate = useNavigate();

  const goToSignIn = () => {
    navigate('/login');
  };

  const handleChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword, dob, gender, city, contact } = signupData;

    if (!name || !email || !password || !confirmPassword || !dob || !gender || !city || !contact) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (signupData.priceLevel === '') {
      alert("Please select a price level.");
      return;
    }

    if (selectedCuisines.length !== 5) {
      alert("Please select exactly 5 favorite cuisines.");
      return;
    }
    if (contact.length != 10) {
      alert("Please enter a valid contact number");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      const userDocRef = doc(db, "userDetails", userCredential.user.uid);
      await setDoc(userDocRef, {
        name,
        email,
        dob,
        gender,
        city,
        contact,
        cuisines: selectedCuisines,
        priceLevel: signupData.priceLevel, 
        createdAt: new Date(),
        role:'foodie'
      });

      alert("User created and data saved!");
      navigate('/');
    } catch (error) {
      alert("Error signing up: " + error.message);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "userDetails", user.uid);
      await setDoc(userDocRef, {
        name: user.displayName || '',
        email: user.email,
        createdAt: new Date(),
        role:'foodie'
      });

      alert("Signed up with Google and saved to Firestore!");
      navigate('/');
    } catch (error) {
      alert("Google UserSignUp failed: " + error.message);
    }
  };
  const cuisineOptions = [...new Set(cuisinesData.restaurants.flat())].sort();

  const [selectedCuisines, setSelectedCuisines] = useState([]);

  const handleCuisineSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);

    if (selected.length > 5) {
      alert("You can only select up to 5 cuisines.");
      return;
    }

    setSelectedCuisines(selected);
  };


  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-lg p-4" style={{ maxWidth: '500px', width: '100%', backgroundColor: '#fff', border: '1px solid #000' }}>
        <h3 className="text-center mb-4 text-dark">Create Account</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Full Name</label>
            <input type="text" name="name" value={signupData.name} onChange={handleChange} className="form-control border-dark text-dark bg-light" required />
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Email</label>
            <input type="email" name="email" value={signupData.email} onChange={handleChange} className="form-control border-dark text-dark bg-light" required />
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Password</label>
            <input type="password" name="password" value={signupData.password} onChange={handleChange} className="form-control border-dark text-dark bg-light" required />
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Confirm Password</label>
            <input type="password" name="confirmPassword" value={signupData.confirmPassword} onChange={handleChange} className="form-control border-dark text-dark bg-light" required />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Date of Birth</label>
            <input type="date" name="dob" value={signupData.dob} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Gender</label>
            <select name="gender" value={signupData.gender} onChange={handleChange} className="form-select border-dark text-dark bg-light">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">City</label>
            <input type="text" name="city" value={signupData.city} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Contact Number</label>
            <input type="tel" name="contact" value={signupData.contact} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Favorite Cuisines (Select 5)</label>
            <select
              multiple
              className="form-select border-dark text-dark bg-light"
              value={selectedCuisines}
              onChange={handleCuisineSelect}
              style={{ height: '150px' }}
            >
              {cuisineOptions.map((cuisine, idx) => (
                <option key={idx} value={cuisine}>{cuisine.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Preferred Price Level</label>
            <select
              name="priceLevel"
              value={signupData.priceLevel}
              onChange={handleChange}
              className="form-select border-dark text-dark bg-light"
            >
              <option value="">Select Price Level</option>
              <option value="0">$ (Cheapest)</option>
              <option value="1">$$</option>
              <option value="2">$$$</option>
              <option value="3">$$$$</option>
              <option value="4">$$$$$ (Most Expensive)</option>
            </select>
          </div>


          <div className="d-grid mt-3">
            <button type="submit" className="btn btn-dark">Sign Up</button>
          </div>
          <small className="text-muted">
            Selected {selectedCuisines.length} of 5 cuisines
          </small>

        </form>

        <div className="d-grid mt-3">
          <button onClick={handleGoogleSignup} className="btn btn-outline-dark">
            Sign Up with Google
          </button>
        </div>

        <div className="d-grid mt-3">
          <button onClick={goToSignIn} className="btn btn-light" style={{ border: '2px solid black' }}>
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserSignUp;
