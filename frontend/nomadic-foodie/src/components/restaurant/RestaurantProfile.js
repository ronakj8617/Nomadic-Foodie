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

function RestaurantProfile() {
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        contact: '',
        priceLevel: '',
        cuisines: []
    });
    const [inputCuisine, setInputCuisine] = useState('');
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');

    const navigate = useNavigate();

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
                    cuisines: data.cuisines || []
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
                name: formData.name,
                city: formData.city,
                contact: formData.contact,
                priceLevel: formData.priceLevel,
                cuisines: formData.cuisines
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
                    <div className="d-grid mt-4">
                        <button type="submit" className="btn btn-dark">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RestaurantProfile;
