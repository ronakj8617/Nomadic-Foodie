import React, { useState, useRef } from 'react';
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
import axios from 'axios';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng
} from 'use-places-autocomplete';

function RestaurantsSignUp() {
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    contact: '',
    priceLevel: '',
    address: ''
  });

  const [cuisines, setCuisines] = useState([]);
  const [input, setInput] = useState('');
  const [markerPosition, setMarkerPosition] = useState({ lat: 28.6139, lng: 77.2090 });
  const mapRef = useRef(null);
  const navigate = useNavigate();

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const result = response.data.results[0];
      if (result) {
        setSignupData(prev => ({ ...prev, address: result.formatted_address }));
      }
    } catch (err) {
      console.error("Failed to reverse geocode:", err);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        setMarkerPosition(coords);
        fetchAddressFromCoords(latitude, longitude);
        if (mapRef.current) mapRef.current.panTo(coords);
      },
      () => alert("Unable to fetch location")
    );
  };

  const AddressSearch = () => {
    const {
      ready,
      value,
      suggestions: { status, data },
      setValue,
      clearSuggestions,
    } = usePlacesAutocomplete({
      requestOptions: {
        componentRestrictions: { country: ['in'] },
      },
    });

    const handleSelect = async (val) => {
      setValue(val, false);
      clearSuggestions();
      try {
        const results = await getGeocode({ address: val });
        const { lat, lng } = await getLatLng(results[0]);
        setMarkerPosition({ lat, lng });
        fetchAddressFromCoords(lat, lng);
        if (mapRef.current) mapRef.current.panTo({ lat, lng });
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    return (
      <div className="mb-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Search your address"
          className="form-control mb-2"
        />
        {status === 'OK' && (
          <ul className="list-group">
            {data.map(({ description }, idx) => (
              <li
                key={idx}
                className="list-group-item list-group-item-action"
                onClick={() => handleSelect(description)}
                style={{ cursor: 'pointer' }}
              >
                {description}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const handleChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const newCuisine = input.trim();
      if (!cuisines.includes(newCuisine)) {
        setCuisines([...cuisines, newCuisine]);
        setInput('');
      }
    }
  };

  const removeCuisine = (cuisineToRemove) => {
    setCuisines(cuisines.filter(cuisine => cuisine !== cuisineToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword, city, contact, address } = signupData;

    if (!name || !email || !password || !confirmPassword || !city || !contact || !address) {
      return alert("Please fill in all fields.");
    }

    if (password !== confirmPassword) {
      return alert("Passwords do not match!");
    }

    if (cuisines.length === 0) {
      return alert("Please add at least one cuisine.");
    }

    if (signupData.priceLevel === '') {
      return alert("Please select a price level.");
    }

    if (contact.length !== 10) {
      return alert("Please enter a valid contact number");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      const userDocRef = doc(db, "restaurantDetails", userCredential.user.uid);
      await setDoc(userDocRef, {
        name,
        email,
        city,
        contact,
        priceLevel: signupData.priceLevel,
        cuisines,
        role: 'restaurant',
        rating: '5',
        address,
        latitude: markerPosition.lat,
        longitude: markerPosition.lng,
        createdAt: new Date()
      });

      alert("User created and data saved!");
      navigate('/');
    } catch (error) {
      alert("Sign up error: " + error.message);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "restaurantDetails", user.uid);
      await setDoc(userDocRef, {
        name: user.displayName || '',
        email: user.email,
        createdAt: new Date(),
        rating: '5',
        cuisines,
        role: 'restaurant'
      });

      alert("Signed up with Google!");
      navigate('/');
    } catch (error) {
      alert("Google signup failed: " + error.message);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-lg p-4" style={{ maxWidth: '500px', width: '100%', border: '1px solid #000' }}>
        <h3 className="text-center mb-4">Register your business</h3>
        <form onSubmit={handleSubmit}>
          {['name', 'email', 'password', 'confirmPassword', 'city', 'contact'].map(field => (
            <div className="mb-3" key={field}>
              <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                type={field.includes('password') ? 'password' : 'text'}
                name={field}
                value={signupData[field]}
                onChange={handleChange}
                className="form-control border-dark"
                required
              />
            </div>
          ))}

          <div>
            <label htmlFor="cuisineInput">Cuisines Served</label>
            <input
              id="cuisineInput"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="form-control mb-2"
              placeholder="Type and press Enter"
            />
            <div className="d-flex flex-wrap">
              {cuisines.map((cuisine, index) => (
                <span key={index} className="badge bg-dark text-white me-2 mb-2" onClick={() => removeCuisine(cuisine)} style={{ cursor: 'pointer' }}>
                  {cuisine} ×
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Price Level</label>
            <select
              name="priceLevel"
              value={signupData.priceLevel}
              onChange={handleChange}
              className="form-select border-dark"
            >
              <option value="">Select Price Level</option>
              <option value="0">$ (Cheapest)</option>
              <option value="1">$$</option>
              <option value="2">$$$</option>
              <option value="3">$$$$</option>
              <option value="4">$$$$$ (Most Expensive)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Restaurant Location</label>
            <AddressSearch />
            <button type="button" onClick={handleLocateMe} className="btn btn-outline-primary btn-sm mb-2">
              📍 Locate Me
            </button>
            <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY} libraries={['places']}>
              <GoogleMap
                center={markerPosition}
                zoom={13}
                mapContainerStyle={{ height: '300px', width: '100%' }}
                onLoad={(map) => (mapRef.current = map)}
                onClick={(e) => {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  setMarkerPosition({ lat, lng });
                  fetchAddressFromCoords(lat, lng);
                }}
              >
                <Marker
                  position={markerPosition}
                  draggable
                  onDragEnd={(e) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    setMarkerPosition({ lat, lng });
                    fetchAddressFromCoords(lat, lng);
                  }}
                />
              </GoogleMap>
            </LoadScript>
            {signupData.address && (
              <div className="alert alert-secondary mt-2">
                <strong>Selected Address:</strong><br />
                {signupData.address}
              </div>
            )}
          </div>

          <div className="d-grid mt-3">
            <button type="submit" className="btn btn-dark">Sign Up</button>
          </div>
        </form>

        <div className="d-grid mt-3">
          <button onClick={handleGoogleSignup} className="btn btn-outline-dark">Sign Up with Google</button>
        </div>

        <div className="d-grid mt-3">
          <button onClick={() => navigate('/restaurantHome')} className="btn btn-light" style={{ border: '2px solid black' }}>
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default RestaurantsSignUp;
