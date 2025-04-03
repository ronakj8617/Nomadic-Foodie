import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import locpin from '../../assets/location-pin.png';
import destpin from '../../assets/destination-pin.png';
import back from '../../assets/back.png';
import profileImg from '../../assets/profile.png';
import diningImg from '../../assets/dining.png'

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
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [vegFilter, setVegFilter] = useState("all"); // "all", "veg", "nonveg"


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
    }
  };

  const fetchRestaurantMenu = async (restaurantId) => {
    try {
      const response = await fetch(`http://localhost:5003/api/restaurants/${restaurantId}/menu`);
      const menu = await response.json();
      setRestaurantMenu(menu);
      if (menu.length > 0) {
        setSelectedCategory(menu[0].category || "Uncategorized");
      }
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
    script.onload = () => getLocation();
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (latLngRef.current) {
      fetchNearby(latLngRef.current);
      fetchBackendRestaurants();
    }
  }, [radius, minRating]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

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
      (error) => {
        console.error("Geolocation error:", error);
        if (error.code === 2) { // kCLErrorLocationUnknown
          alert("Location unknown. Please try again in a few seconds or check GPS settings.");
        } else {
          alert(`Geolocation failed: ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
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
          const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 100 }) || diningImg;

          let cuisine = ["Unknown"];
          try {
            const res = await fetch(`http://localhost:5003/api/foursquare/cuisine?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            cuisine = data.cuisine?.toString().split(',').map(c => c.trim()) || ["Unknown"];
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

      if (!Array.isArray(data)) return;

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

          const cuisines = Array.isArray(r.cuisines) ? r.cuisines : [r.cuisine || "Unknown"];
          return {
            ...r,
            distance: distanceKm,
            position: { lat, lng },
            firestoreId: r.id,
            rating: parseFloat(r.rating || 0),
            cuisine: cuisines
          };
        })
        .filter(r => r && parseFloat(r.distance) <= radius && (!minRating || r.rating >= minRating));

      setBackendRestaurants(formatted);
    } catch (error) {
      console.error("Error fetching restaurants from backend:", error);
    }
  };

  useEffect(() => {
    if (!window.google || !latLngRef.current) return;

    const allRestaurants = [...backendRestaurants, ...visiblePlaces];
    if (allRestaurants.length === 0) return;

    const map = new window.google.maps.Map(document.getElementById("restaurantMap"), {
      center: latLngRef.current,
      zoom: 14,
    });

    mapRef.current = map;

    new window.google.maps.Marker({
      position: latLngRef.current,
      map,
      title: "You are here",
      icon: {
        url: locpin,
        scaledSize: new window.google.maps.Size(40, 40),
      },
    });


    const handleMarkerClick = (place) => {
      setSelectedRestaurant(place);
      if (place.firestoreId) fetchRestaurantMenu(place.firestoreId);
      setShowMenuModal(true);
    };

    allRestaurants.forEach(place => {
      if (!place.position?.lat || !place.position?.lng) return;

      const marker = new window.google.maps.Marker({
        position: place.position,
        map,
        title: place.name,
        icon: {
          url: destpin,
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });

      marker.addListener("click", () => {
        if (place.firestoreId) {
          setSelectedRestaurant(place);
          fetchRestaurantMenu(place.firestoreId);
          setShowMenuModal(true);
        }
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

      });
    });
  }, [backendRestaurants, visiblePlaces]);

  return (
    <div className="container-fluid">
      <style>
        {`
          body {
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          h2 { font-weight: 600; }
          .badge {
            font-size: 0.75rem;
            padding: 0.5em;
            border-radius: 6px;
          }
          .list-group-item:hover {
            background-color: #f1f1f1;
          }
          #restaurantMap {
            border: 2px solid black;
            border-radius: 8px;
          }
          .card:hover {
            transform: scale(1.01);
            transition: 0.2s ease-in-out;
          }

        `}
      </style>

      <div className="row align-items-center position-relative">
        <div className="col-auto" onClick={goToHome} style={{ cursor: 'pointer' }}>
          <img src={back} alt="Back" style={{ width: '2rem', height: '2rem', margin: '10px' }} />
        </div>
        <div className="col text-center"><h2 className="m-0">Nearby Restaurants</h2></div>
        <div className="col-auto" onClick={goToProfile} style={{ cursor: 'pointer' }}>
          <img src={profileImg} alt="UserProfile" style={{ width: '2rem', height: '2rem', margin: '10px' }} />
        </div>
      </div>
      <hr />

      <div className="container mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">Filter by Radius (km)</label>
            <select className="form-select" style={{ backgroundColor: "black", color: 'white' }} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[1, 3, 5, 10, 15, 20, 30, 50].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-bold">Minimum Rating</label>
            <select className="form-select" style={{ backgroundColor: "black", color: 'white' }} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              {[0, 3, 4, 4.5].map(r => <option key={r} value={r}>{r} ⭐</option>)}
            </select>
          </div>
        </div>
      </div>
      {/* <div className="col text-center">
        <h5 className="mb-3 text-start">
          Restaurants Found: {loading ? (
            <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
          ) : (
            <strong>{backendRestaurants.length + visiblePlaces.length}</strong>
          )}
        </h5>
      </div> */}
      <div className="d-flex flex-row gap-3" style={{ height: '80vh' }}>

        {/* Scrollable List */}
        <div className="flex-fill" style={{ maxWidth: '50%', overflowY: 'auto', borderRadius: '8px', paddingRight: '8px' }}>


          <div className="list-group" style={{ border: '2px solid black' }}>
            {[...backendRestaurants, ...visiblePlaces].map((place, index) => (
              <div key={index} className="list-group-item list-group-item-action d-flex align-items-start">
                <img src={place.photo ? place.photo : diningImg} alt="restaurant" className="me-3" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
                <div className="w-100">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-1">{place.name}</h5>
                    <div className="d-flex gap-2">
                      {place.firestoreId && (
                        <button
                          className="btn btn-sm btn-dark"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRestaurant(place);
                            fetchRestaurantMenu(place.firestoreId);
                            setShowMenuModal(true);
                          }}
                        >
                          Menu
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-dark"
                        title="View on map"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.google && place.position && mapRef.current) {
                            mapRef.current.setCenter(place.position);
                            mapRef.current.setZoom(17);
                          }
                        }}
                      >
                        📍
                      </button>
                    </div>
                  </div>
                  <p className="mb-1 text-muted">{place.address || 'Address unavailable'}</p>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    {place.cuisine?.map((tag, i) => (
                      <span key={i} className="badge bg-dark">{tag}</span>
                    ))}
                    <small className="text-muted">Rating: {place.rating || 'N/A'} ⭐</small>
                    <small className="text-muted">• {place.distance} km away</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-fill" style={{ minWidth: '50%' }}>
          <div id="restaurantMap" style={{ height: '100%', width: '100%', border: '2px solid black', borderRadius: '8px' }}></div>
        </div>
      </div>

      <Modal show={showMenuModal} onHide={() => setShowMenuModal(false)} style={{ border: '2px solid black', borderRadius: '10px' }}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedRestaurant?.name} - Menu</Modal.Title>
        </Modal.Header>
        {/* <pre>{JSON.stringify(restaurantMenu, null, 2)}</pre> */}
        <Modal.Body style={{ backgroundColor: "#f8f9fa", maxHeight: "70vh", overflowY: "auto" }}>
          {restaurantMenu.length > 0 ? (
            <>
              {/* Category Tabs */}
              <ul className="nav nav-tabs mb-3" role="tablist">
                {Object.entries(
                  restaurantMenu.reduce((acc, item) => {
                    const category = item.category || "Uncategorized";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(item);
                    return acc;
                  }, {})
                ).map(([category]) => (
                  <li className="nav-item" key={category} style={{ borderRadius: '9px', marginRight: '7px' }}>
                    <button
                      className="nav-link"
                      style={{
                        backgroundColor: selectedCategory === category ? 'black' : 'white',
                        color: selectedCategory === category ? 'white' : 'black',
                        border: '1px solid black',
                        borderRadius: '8px',
                        marginRight: '6px',
                        fontWeight: '500',
                      }}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>

                  </li>
                ))}
              </ul>

              {/* Veg / Non-Veg Filter */}
              <div className="btn-group mb-3" role="group">
                <button
                  className={`btn btn-sm ${vegFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setVegFilter("all")}
                >
                  All
                </button>
                <button
                  className={`btn btn-sm ${vegFilter === "veg" ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setVegFilter("veg")}
                >
                  Veg 🥦
                </button>
                <button
                  className={`btn btn-sm ${vegFilter === "nonveg" ? "btn-danger" : "btn-outline-danger"}`}
                  onClick={() => setVegFilter("nonveg")}
                >
                  Non-Veg 🍗
                </button>
              </div>

              {/* Filtered Items */}
              <div className="row row-cols-1 g-3">
                {restaurantMenu
                  .filter(item => selectedCategory === null || item.category === selectedCategory)
                  .filter(item =>
                    vegFilter === "all"
                      ? true
                      : vegFilter === "veg"
                        ? item.veg === true
                        : item.veg === false
                  )
                  .map((item, i) => (
                    <div className="col" key={i}>
                      <div className="card shadow-sm border-0 h-100">
                        <div
                          className="card-body"
                          style={{
                            border: "2px solid black",
                            borderRadius: "9px",
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="card-title mb-0 fw-semibold">{item.name}</h6>
                            <span className="fw-bold text-success">₹{item.price}</span>
                          </div>
                          <p className="card-text text-dark mb-2" style={{ fontSize: "0.9rem" }}>
                            {item.description || "No description available."}
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="badge bg-light text-dark border">
                              {item.veg ? "🟢 Veg" : "🔴 Non-Veg"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-muted">No menu available.</p>
          )}
        </Modal.Body>


        <Modal.Footer>
          <Button variant="dark" onClick={() => setShowMenuModal(false)}>Close</Button>
        </Modal.Footer>

      </Modal>
    </div>
  );
};

export default NearByRestaurantsList;
