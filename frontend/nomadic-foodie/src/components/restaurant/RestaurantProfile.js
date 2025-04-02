import React, { useEffect, useState, useRef } from 'react';
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
    updatePassword
} from 'firebase/auth';
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import axios from 'axios';

function RestaurantProfile() {
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        contact: '',
        priceLevel: '',
        cuisines: [],
        address: '',
        latitude: 28.6139,
        longitude: 77.2090
    });
    const [inputCuisine, setInputCuisine] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(true);
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
                setFormData(prev => ({
                    ...prev,
                    address: result.formatted_address,
                    latitude: lat,
                    longitude: lng
                }));
            }
        } catch (err) {
            console.error("Reverse geocoding failed:", err);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                fetchAddressFromCoords(latitude, longitude);
                if (mapRef.current) {
                    mapRef.current.panTo({ lat: latitude, lng: longitude });
                }
            },
            (err) => {
                console.error("Location error:", err);
                alert("Could not retrieve your location.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
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
                fetchAddressFromCoords(lat, lng);
                if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                }
            } catch (err) {
                console.error("Autocomplete error:", err);
            }
        };

        return (
            <div className="mb-2">
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Search your address"
                    className="form-control mb-2"
                />
                {status === 'OK' && (
                    <ul className="list-group">
                        {data.map(({ description }, idx) => (
                            <li
                                key={idx}
                                className="list-group-item list-group-item-action"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelect(description)}
                            >
                                {description}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate('/login');
                return;
            }

            const docRef = doc(db, 'restaurantDetails', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    name: data.name || '',
                    city: data.city || '',
                    contact: data.contact || '',
                    priceLevel: data.priceLevel || '',
                    cuisines: data.cuisines || [],
                    address: data.address || '',
                    latitude: data.latitude || 28.6139,
                    longitude: data.longitude || 77.2090
                });
            } else {
                alert("Profile not found.");
                navigate('/');
            }

            setLoading(false);
        };

        fetchProfile();
    }, [navigate]);

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleAddCuisine = (e) => {
        e.preventDefault();
        const trimmed = inputCuisine.trim();
        if (trimmed && !formData.cuisines.includes(trimmed)) {
            setFormData(prev => ({
                ...prev,
                cuisines: [...prev.cuisines, trimmed]
            }));
            setInputCuisine('');
        }
    };

    const handleRemoveCuisine = (cuisineToRemove) => {
        setFormData(prev => ({
            ...prev,
            cuisines: prev.cuisines.filter(c => c !== cuisineToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            const docRef = doc(db, 'restaurantDetails', user.uid);
            const passwordHistoryCollection = collection(db, "oldPasswords", user.uid, "history");

            await updateDoc(docRef, {
                ...formData,
                createdAt: new Date()
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

            alert("Profile updated successfully!");
            navigate('/restauranthome');
        } catch (error) {
            alert("Failed to update profile: " + error.message);
        }
    };

    if (loading) return <div className="text-center mt-5">Loading...</div>;

    return (
        <div className="container mt-5">
            <div className="card shadow p-4 border-dark">
                <h3 className="text-center mb-4">Edit Profile</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Business Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control border-dark" required />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-control border-dark" required />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Contact Number</label>
                        <input type="tel" name="contact" value={formData.contact} onChange={handleChange} className="form-control border-dark" required />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Price Level</label>
                        <select
                            name="priceLevel"
                            value={formData.priceLevel}
                            onChange={handleChange}
                            className="form-select border-dark"
                            required
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
                        <label className="form-label">Cuisines Served</label>
                        <div className="d-flex mb-2">
                            <input
                                type="text"
                                value={inputCuisine}
                                onChange={(e) => setInputCuisine(e.target.value)}
                                className="form-control me-2"
                                placeholder="Add cuisine"
                            />
                            <button className="btn btn-dark" onClick={handleAddCuisine}>Add</button>
                        </div>
                        <div className="d-flex flex-wrap">
                            {formData.cuisines.map((cuisine, index) => (
                                <span
                                    key={index}
                                    className="badge bg-dark text-white me-2 mb-2"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleRemoveCuisine(cuisine)}
                                >
                                    {cuisine} ×
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Restaurant Location</label>
                        <AddressSearch />
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm mb-2"
                            onClick={handleLocateMe}
                        >
                            📍 Locate Me
                        </button>
                        <LoadScript
                            googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
                            libraries={['places']}  
                        >
                            <GoogleMap
                                center={{ lat: formData.latitude, lng: formData.longitude }}
                                zoom={13}
                                mapContainerStyle={{ height: '300px', width: '100%' }}
                                onLoad={(map) => (mapRef.current = map)}
                                onClick={(e) => fetchAddressFromCoords(e.latLng.lat(), e.latLng.lng())}
                            >
                                <Marker
                                    position={{ lat: formData.latitude, lng: formData.longitude }}
                                    draggable
                                    onDragEnd={(e) => fetchAddressFromCoords(e.latLng.lat(), e.latLng.lng())}
                                />
                            </GoogleMap>
                        </LoadScript>

                        {formData.address && (
                            <div className="alert alert-secondary mt-2">
                                <strong>Selected Address:</strong><br />
                                {formData.address}
                            </div>
                        )}
                    </div>

                    <div className="mb-3">
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="form-control border-dark"
                        />
                    </div>

                    <div className="d-grid mt-4">
                        <button type="submit" className="btn btn-dark">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RestaurantProfile;
