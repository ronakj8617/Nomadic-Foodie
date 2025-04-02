import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebaseconfig';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  signOut
} from 'firebase/auth';
import bcrypt from 'bcryptjs';

import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import logoutImg from '../../assets/logout.png';
import back from '../../assets/back.png';
import cuisinesData from './cuisines.json';


function UserProfile() {
  const cuisineOptions = [...new Set(cuisinesData.restaurants.flat())].sort();
  const [selectedCuisines, setSelectedCuisines] = useState([]);

  const [userDetails, setUserDetails] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const goToHome = () => navigate('/userHome');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const docRef = doc(db, "userDetails", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserDetails(data);
          setSelectedCuisines(data.cuisines || []);
        } else {
          setError("⚠️ User UserProfile information is missing.");
        }
      } catch (error) {
        console.error("Error loading UserProfile:", error.message);
        setError("❌ Failed to load UserProfile. Please try again later.");
      }

      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [navigate]);


  const handleChange = (e) => {
    setUserDetails({ ...userDetails, [e.target.name]: e.target.value });
  };

  const handleCuisineSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    if (selected.length > 5) {
      alert("You can only select exactly 5 cuisines.");
      return;
    }
    setSelectedCuisines(selected);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !userDetails) return;

    try {
      const userRef = doc(db, "userDetails", user.uid);
      const passwordHistoryCollection = collection(db, "oldPasswords", user.uid, "history");

      if (selectedCuisines.length !== 5) {
        alert("Please select exactly 5 favorite cuisines.");
        return;
      }

      await updateDoc(userRef, {
        name: userDetails.name || '',
        dob: userDetails.dob || '',
        gender: userDetails.gender || '',
        city: userDetails.city || '',
        contact: userDetails.contact || '',
        cuisines: selectedCuisines,
        priceLevel: userDetails.priceLevel ?? ''
      });

      await updateProfile(user, {
        displayName: userDetails.name
      });

      if (newPassword.length >= 6) {
        const querySnapshot = await getDocs(passwordHistoryCollection);
        const oldHashes = querySnapshot.docs.map(doc => doc.data().hash);

        for (let hash of oldHashes) {
          const match = await bcrypt.compare(newPassword, hash);
          if (match) {
            alert("You can't reuse an old password.");
            return;
          }
        }

        await updatePassword(user, newPassword);

        const newHash = await bcrypt.hash(newPassword, 10);
        await addDoc(passwordHistoryCollection, {
          hash: newHash,
          timestamp: new Date()
        });

        alert("Password updated successfully.");
      }


      alert("UserProfile updated successfully.");
    } catch (error) {
      console.error("Error updating UserProfile:", error.message);
      alert("Update failed: " + error.message);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error.message);
      alert('Logout failed. Try again.');
    }
  };

  if (!authChecked) return <div className="text-center mt-5">🔐 Checking authentication...</div>;
  if (error) return <div className="text-center mt-5 text-danger">{error}</div>;
  if (!userDetails) return <div className="text-center mt-5">⏳ Loading UserProfile info...</div>;

  return (
    <div className="container text-center">
      <div className="row align-items-center position-relative">
        <div className="col-auto" style={{ cursor: 'pointer' }} onClick={goToHome}>
          <img src={back} style={{ width: '2rem', height: '2rem', margin: '10px' }} alt="Back" />
        </div>

        <div className="col text-center">
          <h2 className="m-0">Edit UserProfile</h2>
        </div>

        <div className="col-auto">
          <img
            src={logoutImg}
            onClick={handleLogout}
            style={{ width: '2rem', height: '2rem', margin: '10px', cursor: 'pointer' }}
            alt="Logout"
          />

        </div>
      </div>
      <hr />

      <div className="container mt-4">
        <div className="card p-4 shadow border-dark" style={{ maxWidth: '600px', margin: 'auto' }}>
          <h3 className="text-center text-dark mb-4">Your UserProfile</h3>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Full Name</label>
            <input name="name" value={userDetails.name} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Email</label>
            <input value={userDetails.email} disabled className="form-control border-dark text-muted bg-light" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Date of Birth</label>
            <input type="date" name="dob" value={userDetails.dob} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Gender</label>
            <select name="gender" value={userDetails.gender} onChange={handleChange} className="form-select border-dark text-dark bg-light">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">City</label>
            <input name="city" value={userDetails.city} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label text-dark">Contact</label>
            <input name="contact" value={userDetails.contact} onChange={handleChange} className="form-control border-dark text-dark bg-light" />
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
                <option key={idx} value={cuisine}>
                  {cuisine.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <small className="text-muted">Selected {selectedCuisines.length} of 5 cuisines</small>
          </div>
          <div className="mb-3 text-start">
            <label className="form-label text-dark">Preferred Price Level</label>
            <select
              name="priceLevel"
              value={userDetails.priceLevel || ''}
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


          <div className="mb-3 text-start">
            <label className="form-label text-dark">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="form-control border-dark text-dark bg-light"
            />
          </div>

          <div className="d-grid mt-3">
            <button className="btn btn-dark" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
