import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import locpin from '../../assets/location-pin.png';
import destpin from '../../assets/destination-pin.png';

import back from '../../assets/back.png';
import profileImg from '../../assets/profile.png';

const VisitHistory = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null); // ✅ for centering map
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  const { isLoaded: googleReady } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const goToHome = () => navigate('/userHome');
  const goToProfile = () => navigate('/UserProfile');

  useEffect(() => {
    const fetchVisitHistory = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
        );

        const userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(userCoords);

        const visitsRef = collection(db, `visitHistory/${user.uid}/visits`);
        const snapshot = await getDocs(visitsRef);

        const data = snapshot.docs.map((doc) => {
          const visit = doc.data();
          return {
            id: doc.id,
            ...visit,
            timestamp: visit.timestamp?.toDate?.().toLocaleString() || 'Unknown',
          };
        });

        setVisits(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (err) {
        console.error('Failed to fetch visit history or geolocation:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitHistory();
  }, []);

  const handleRatingChange = async (visitId, newRating) => {
    const user = auth.currentUser;
    if (!user) return;

    const visitRef = doc(db, `visitHistory/${user.uid}/visits/${visitId}`);
    await updateDoc(visitRef, { rating: newRating });

    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, rating: newRating } : v))
    );
  };

  return (
    <div className="container-fluid text-center">
      <div className="row align-items-center position-relative">
        <div className="col-auto" style={{ cursor: 'pointer' }} onClick={goToHome}>
          <img src={back} alt="Back" style={{ width: '2rem', height: '2rem', margin: '10px' }} />
        </div>
        <div className="col text-center">
          <h2 className="m-0">Visit History</h2>
        </div>
        <div className="col-auto" style={{ cursor: 'pointer' }} onClick={goToProfile}>
          <img
            src={profileImg}
            alt="UserProfile"
            style={{ width: '2rem', height: '2rem', margin: '10px' }}
          />
        </div>
      </div>
      <hr />
      <div className="row" style={{ height: '80vh' }}>
        <div className="col-md-4 border-end p-3 text-start bg-light overflow-auto">
          <h5 className="mb-3 text-center">Places You've Visited</h5>
          {loading ? (
            <p>Loading...</p>
          ) : visits.length === 0 ? (
            <p>No visit history found.</p>
          ) : (
            <div className="list-group" style={{ border: '2px solid black' }}>
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="list-group-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedVisit(visit)}
                >
                  <h6 className="mb-1">{visit.placeName}</h6>
                  <p className="mb-1 text-muted">{visit.address}</p>
                  <div className="d-flex align-items-center justify-content-between">
                    <small className="text-muted">
                      {visit.rating === 1 ? 'Liked' : visit.rating === 0 ? 'Disliked' : 'No rating'} • {visit.cuisine} • {visit.timestamp}
                    </small>

                    <div className="btn-group" role="group">
                      <button
                        className={`btn btn-sm ${visit.rating === 1 ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => handleRatingChange(visit.id, 1)}
                      >
                        👍
                      </button>
                      <button
                        className={`btn btn-sm ${visit.rating === 0 ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => handleRatingChange(visit.id, 0)}
                      >
                        👎
                      </button>
                    </div>

                  </div>

                  {visit.allCuisines && visit.allCuisines.length > 0 && (
                    <div className="mt-2">
                      <strong className="d-block">Cuisines:</strong>
                      <div className="d-flex flex-wrap gap-1">
                        {visit.allCuisines.map((cuisine, i) => (
                          <span key={i} className="badge bg-dark">
                            {cuisine}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-md-8 p-0" style={{ border: '2px solid black' }}>
          {googleReady && userLocation && (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={
                selectedVisit
                  ? { lat: selectedVisit.lat, lng: selectedVisit.lng }
                  : userLocation
              }
              zoom={selectedVisit ? 16 : 13}
            >
              {/* <Marker
                position={userLocation}
                title="You are here"
                icon={{
                  url: locpin,
                  scaledSize: new window.google.maps.Size(40, 40) 
                }}
              /> */}
              {visits.map(
                (visit) =>
                  visit.lat &&
                  visit.lng && (
                    <Marker
                      key={visit.id}
                      position={{ lat: visit.lat, lng: visit.lng }}
                      title={visit.placeName}
                    />
                  )
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitHistory;
