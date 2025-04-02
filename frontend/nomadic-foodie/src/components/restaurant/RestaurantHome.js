import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function RestaurantHome() {
  const [restaurantData, setRestaurantData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurantData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDocRef = doc(db, 'restaurantDetails', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.role === 'restaurant') {
          setRestaurantData(data);
        } else {
          alert('Access denied: Not a restaurant account.');
          navigate('/login');
        }
      } else {
        alert('No restaurant data found.');
        navigate('/login');
      }
    };

    fetchRestaurantData();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (!restaurantData) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="container py-5">
      <div className="card shadow p-4 border-dark">
        <h2 className="text-center mb-4">Welcome, {restaurantData.name}!</h2>

        <div className="mb-3">
          <strong>Email:</strong> {restaurantData.email}
        </div>
        <div className="mb-3">
          <strong>City:</strong> {restaurantData.city}
        </div>
        <div className="mb-3">
          <strong>Contact:</strong> {restaurantData.contact}
        </div>
        <div className="mb-3">
          <strong>Price Level:</strong> {'$'.repeat(Number(restaurantData.priceLevel) + 1)}
        </div>
        <div className="mb-3">
          <strong>Cuisines Served:</strong>
          <ul>
            {restaurantData.cuisines?.map((cuisine, index) => (
              <li key={index}>{cuisine}</li>
            ))}
          </ul>
        </div>

        <div className="d-flex justify-content-between mt-4">
          <button className="btn btn-dark" onClick={() => navigate('/restaurantProfile')}>
            Edit UserProfile
          </button>
          <button className="btn btn-outline-dark" onClick={() => navigate('/addmenu')}>
            Add Menu
          </button>
          <button className="btn btn-dark" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default RestaurantHome;
