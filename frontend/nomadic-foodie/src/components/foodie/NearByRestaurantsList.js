import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import back from '../../assets/back.png';
import profileImg from '../../assets/profile.png';

const NearByRestaurantsList = () => {
  const [visiblePlaces, setVisiblePlaces] = useState([]);
  const [backendRestaurants, setBackendRestaurants] = useState([]);
  const [radius, setRadius] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantMenu, setRestaurantMenu] = useState([]);

  const latLngRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem('hasReloadedNearbyList')) {
      sessionStorage.setItem('hasReloadedNearbyList', 'true');
      window.location.reload();
    } else {
      sessionStorage.removeItem('hasReloadedNearbyList');
    }
  }, []);

  const goToHome = () => navigate('/userHome');
  const goToProfile = () => navigate('/UserProfile');

  const handleClick = (place) => {
    if (place.firestoreId) {
      setSelectedRestaurant(place);
      fetchRestaurantMenu(place.firestoreId);
      setShowMenuModal(true);
    } else {
      navigate('/map', {
        state: {
          destination: place.position,
          meta: {
            name: place.name,
            address: place.address,
            rating: place.rating,
            cuisine: place.cuisine
          }
        }
      });
    }
  };

  const fetchRestaurantMenu = async (restaurantId) => {
    try {
      const response = await fetch(`http://localhost:5003/api/restaurants/${restaurantId}/menu`);
      const menu = await response.json();
      setRestaurantMenu(menu);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
      setRestaurantMenu([]);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Maps loaded");
      getLocation();
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (latLngRef.current) {
      fetchNearby(latLngRef.current);
      fetchBackendRestaurants();
    }
  }, [radius, minRating]);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        latLngRef.current = userLatLng;
        fetchNearby(userLatLng);
        fetchBackendRestaurants();
      },
      () => alert("Geolocation failed.")
    );
  };

  const fetchNearby = async (coords) => {
    setLoading(true);

    const gmaps = window.google.maps;
    const map = new gmaps.Map(document.createElement("div"));
    const service = new gmaps.places.PlacesService(map);

    service.nearbySearch(
      {
        location: coords,
        radius: radius * 1000,
        type: "restaurant"
      },
      async (results, status) => {
        if (status !== gmaps.places.PlacesServiceStatus.OK || !results) {
          alert("No nearby restaurants found.");
          setVisiblePlaces([]);
          setLoading(false);
          return;
        }

        const origin = new gmaps.LatLng(coords.lat, coords.lng);

        const placePromises = results.map(async place => {
          if (!place.geometry?.location || place.rating < minRating) return null;

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const distanceMeters = gmaps.geometry.spherical.computeDistanceBetween(
            origin,
            place.geometry.location
          );
          const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 100 }) || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

          // Fetch cuisine from Foursquare
          let cuisine = "Unknown Cuisine";
          try {
            const FOURSQUARE_SERVER = process.env.REACT_APP_FOURSQUARE_SERVER_URL || 'http://localhost:5003';
            const res = await fetch(`${FOURSQUARE_SERVER}/api/foursquare/cuisine?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            cuisine = data.cuisine;
          } catch (e) {
            console.warn("Cuisine fetch failed for:", place.name);
          }

          return {
            name: place.name,
            address: place.vicinity,
            rating: place.rating,
            distance: (distanceMeters / 1000).toFixed(2),
            photo: photoUrl,
            cuisine,
            position: { lat, lng }
          };
        });

        const resolvedPlaces = (await Promise.all(placePromises)).filter(Boolean);
        setVisiblePlaces(resolvedPlaces);
        setLoading(false);
      }
    );
  };

  const fetchBackendRestaurants = async () => {
    try {
      const response = await fetch("http://localhost:5003/api/restaurants");
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error("Invalid API data (not array):", data);
        return;
      }

      const userLocation = new window.google.maps.LatLng(
        latLngRef.current.lat,
        latLngRef.current.lng
      );

      const formatted = data
        .map(r => {
          const lat = r.location?.lat;
          const lng = r.location?.lng;

          if (!lat || !lng) return null;

          const restaurantLocation = new window.google.maps.LatLng(lat, lng);
          const distanceMeters = window.google.maps.geometry.spherical.computeDistanceBetween(
            userLocation,
            restaurantLocation
          );
          const distanceKm = (distanceMeters / 1000).toFixed(2);

          const numericRating = parseFloat(r.rating || 0);

          return {
            ...r,
            distance: distanceKm,
            position: { lat, lng },
            firestoreId: r.id,
            rating: numericRating
          };
        })
        .filter(r => {
          if (!r) return false;
          return (
            parseFloat(r.distance) <= radius &&
            (!minRating || r.rating >= minRating)
          );
        });

      setBackendRestaurants(formatted);
    } catch (error) {
      console.error("Error fetching restaurants from backend:", error);
    }
  };


  return (
    <div className="container text-center">
      <div className="row align-items-center position-relative">
        <div className="col-auto" style={{ cursor: 'pointer' }} onClick={goToHome}>
          <img src={back} style={{ width: '2rem', height: '2rem', margin: '10px' }} alt="Back" />
        </div>
        <div className="col text-center">
          <h2 className="m-0">Nearby Restaurants</h2>
        </div>
        <div className="col-auto" style={{ cursor: 'pointer' }} onClick={goToProfile}>
          <img src={profileImg} style={{ width: '2rem', height: '2rem', margin: '10px' }} alt="UserProfile" />
        </div>
      </div>
      <hr />

      <div className="container mb-4">
        <div className="row g-3">
          <div className="col-md-6 text-start">
            <label className="form-label fw-bold">Filter by Radius (km)</label>
            <select className="form-select" style={{ backgroundColor: "black", color: 'white' }} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[1, 3, 5, 10, 15, 20, 30, 50].map(r => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
          </div>
          <div className="col-md-6 text-start">
            <label className="form-label fw-bold">Minimum Rating</label>
            <select className="form-select" style={{ backgroundColor: "black", color: 'white' }} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              {[0, 3, 4, 4.5].map(r => (
                <option key={r} value={r}>{r} ⭐</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="container mt-4" style={{ maxWidth: '700px' }}>
        <h4 className="mb-3 text-start">
          Restaurants Found:{" "}
          {loading ? (
            <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></span>
          ) : (
            <strong>{backendRestaurants.length + visiblePlaces.length}</strong>
          )}
        </h4>

        <div className="list-group">
          {[...backendRestaurants, ...visiblePlaces].map((place, index) => (
            <div
              key={index}
              className="list-group-item list-group-item-action d-flex align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => handleClick(place)}
            >
              <img
                src={place.photo ? place.photo : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"}
                alt="restaurant"
                className="me-3"
                style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <div className="text-start">
                <h5 className="mb-1">{place.name}</h5>
                <p className="mb-1 text-muted">{place.address}</p>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="badge bg-secondary">{place.cuisine || 'N/A'}</span>
                  <small className="text-muted">Rating: {place.rating || 'N/A'} ⭐</small>
                  <small className="text-muted">• {place.distance} km away</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal show={showMenuModal} onHide={() => setShowMenuModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedRestaurant?.name} - Menu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {restaurantMenu.length > 0 ? (
            <ul className="list-group">
              {restaurantMenu.map((item, index) => (
                <li key={index} className="list-group-item">
                  <div className="fw-bold">{item.name} - ₹{item.price}</div>
                  <div className="text-muted">{item.description}</div>
                  <small>
                    Category: {item.category} | {item.isVeg ? "Veg 🥬" : "Non-Veg 🍗"}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No menu available.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMenuModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default NearByRestaurantsList;
