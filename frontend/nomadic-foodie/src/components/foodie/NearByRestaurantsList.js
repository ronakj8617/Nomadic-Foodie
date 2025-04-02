import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import back from '../../assets/back.png';
import profileImg from '../../assets/profile.png';

const NearByRestaurantsList = () => {
  useEffect(() => {
    if (!sessionStorage.getItem('hasReloadedNearbyList')) {
      sessionStorage.setItem('hasReloadedNearbyList', 'true');
      window.location.reload();
    } else {
      sessionStorage.removeItem('hasReloadedNearbyList');
    }
  }, []);

  const [visiblePlaces, setVisiblePlaces] = useState([]);
  const [radius, setRadius] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const latLngRef = useRef(null);
  const navigate = useNavigate();

  const goToHome = () => {
    navigate('/userHome');
  };

  const goToProfile = () => {
    navigate('/UserProfile');
  };

  const handleClick = (place) => {
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
          setVisiblePlaces([]); // ✅ Restore this
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
          const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 100 }) || "https://via.placeholder.com/100";

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
        setLoading(false); // ✅ ✅ ✅ THIS WAS MISSING
      }
    );
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
            <strong>{visiblePlaces.length}</strong>
          )}
        </h4>

        <div className="list-group">
          {visiblePlaces.map((place, index) => (
            <div
              key={index}
              className="list-group-item list-group-item-action d-flex align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => handleClick(place)}
            >
              <img
                src={place.photo}
                alt="restaurant"
                className="me-3"
                style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <div className="text-start">
                <h5 className="mb-1">{place.name}</h5>
                <p className="mb-1 text-muted">{place.address}</p>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="badge bg-secondary">{place.cuisine}</span>
                  <small className="text-muted">Rating: {place.rating || 'N/A'} ⭐</small>
                  <small className="text-muted">• {place.distance} km away</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NearByRestaurantsList;