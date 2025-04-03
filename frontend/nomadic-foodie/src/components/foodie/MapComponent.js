import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import back from '../../assets/back.png';
import profileImg from '../../assets/profile.png';
import locpin from '../../assets/location-pin.png';
import destpin from '../../assets/destination-pin.png';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import diningImg from '../../assets/dining.png'

const MapComponent = () => {
  const mapRef = useRef(null);
  const mapRefObject = useRef(null);
  const [routeType, setRouteType] = useState("DRIVING");
  const [googleReady, setGoogleReady] = useState(false);
  const directionsRendererRef = useRef(null);
  const destinationRef = useRef(null);
  const latLngRef = useRef(null);
  const infowindowRef = useRef(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [user, setUser] = useState(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const hasPrompted = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const db = getFirestore();
  const auth = getAuth();

  const visitedTodayRef = useRef(new Set());

  const [showModal, setShowModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);

  const goToHome = () => navigate('/userHome');
  const goToProfile = () => navigate('/UserProfile');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    hasPrompted.current = false;
    visitedTodayRef.current.clear();
  }, [googleReady]);

  useEffect(() => {
    if (!googleReady) return;

    if (location.state?.destination) {
      if (location.state?.destination) {
        destinationRef.current = location.state.destination;

        const fetchMeta = async () => {
          const meta = location.state.meta ?? {
            name: 'Unknown',
            address: 'Unknown',
            rating: 'N/A',
            cuisine: 'Unknown'
          };

          let cuisine = meta.cuisine;

          // If it's missing or not an array (i.e., not from Firestore), fetch it from Foursquare
          if (!cuisine || (typeof cuisine === 'string' && cuisine === 'Unknown') || Array.isArray(cuisine) === false) {
            cuisine = await fetchCuisineFromFoursquare(
              location.state.destination.lat,
              location.state.destination.lng
            );
          }

          setRestaurantDetails({ ...meta, cuisine });
        };


        fetchMeta();
        getLocation();
      }

    } else {
      getLocation(true);
    }
  }, [googleReady]);

  useEffect(() => {
    if (
      googleReady &&
      latLngRef.current &&
      mapRefObject.current &&
      destinationRef.current &&
      restaurantDetails &&
      user
    ) {
      getDirections(destinationRef.current.lat, destinationRef.current.lng);
      startProximityWatcher();
    }
  }, [googleReady, routeType, restaurantDetails, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ready =
      googleReady &&
      latLngRef.current &&
      mapRefObject.current &&
      destinationRef.current &&
      restaurantDetails;

    if (!ready) return;

    getDirections(destinationRef.current.lat, destinationRef.current.lng);
  }, [googleReady, restaurantDetails, routeType]);


  useEffect(() => {
    console.log("✅ restaurantDetails ready:", restaurantDetails);
  }, [restaurantDetails]);

  useEffect(() => {
    console.log("📍 Drawing route with:", routeType);
  }, [routeType]);


  const getLocation = (searchNearest = false, onlyCenter = false) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        latLngRef.current = coords;

        const gmaps = window.google.maps;

        if (onlyCenter && mapRefObject.current) {
          mapRefObject.current.setCenter(coords);

          if (!userMarkerRef.current) {
            userMarkerRef.current = new gmaps.Marker({
              position: coords,
              map: mapRefObject.current,
              title: "You are here",
              icon: {
                url: locpin,
                scaledSize: new gmaps.Size(40, 40)
              }
            });
          } else {
            userMarkerRef.current.setPosition(coords);
          }

          if (!infowindowRef.current) {
            infowindowRef.current = new gmaps.InfoWindow({
              content: "You are here!"
            });
          }

          infowindowRef.current.setContent("You are here!");
          infowindowRef.current.setPosition(coords);
          infowindowRef.current.open(mapRefObject.current, userMarkerRef.current);

          return;
        }

        initMap(coords, searchNearest);
      },
      (error) => {
        console.error("Geolocation error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchCuisineFromFoursquare = async (lat, lng) => {
    try {
      const FOURSQUARE_SERVER = process.env.REACT_APP_FOURSQUARE_SERVER_URL || 'http://localhost:5003';

      const res = await fetch(`${FOURSQUARE_SERVER}/api/foursquare/cuisine?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      return data.cuisine || "Unknown Cuisine";
    } catch (err) {
      console.warn("🍽️ Failed to fetch cuisine:", err);
      return "Unknown Cuisine";
    }
  };

  const initMap = (coords, searchNearest = false) => {
    const gmaps = window.google.maps;
    const mapObj = new gmaps.Map(mapRef.current, { center: coords, zoom: 14 });
    mapRefObject.current = mapObj;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new gmaps.Marker({
      position: coords,
      map: mapObj,
      title: "You are here",
      icon: { url: locpin, scaledSize: new gmaps.Size(40, 40) }
    });

    infowindowRef.current = new gmaps.InfoWindow({ content: "You are here!" });
    infowindowRef.current.open(mapObj);

    if (destinationRef.current) {
      placeDestinationMarker(destinationRef.current);
      getDirections(destinationRef.current.lat, destinationRef.current.lng);
    } else if (searchNearest) {
      findNearestRestaurant(coords);
    }
  };

  const findNearestRestaurant = (coords) => {
    const gmaps = window.google.maps;
    const service = new gmaps.places.PlacesService(mapRefObject.current);

    service.nearbySearch({ location: coords, radius: 3000, type: 'restaurant' }, async (results, status) => {
      if (status === gmaps.places.PlacesServiceStatus.OK && results.length > 0) {
        const nearest = results[0];
        const loc = nearest.geometry.location;
        const cuisine = await fetchCuisineFromFoursquare(loc.lat(), loc.lng());
        const meta = {
          name: nearest.name || 'Unnamed Place',
          address: nearest.vicinity || 'Unknown',
          rating: nearest.rating || 'N/A',
          cuisine,
          photo: nearest.photos?.[0]?.getUrl({ maxWidth: 400 }) || diningImg
        };

        destinationRef.current = { lat: loc.lat(), lng: loc.lng() };
        setRestaurantDetails(meta);
        placeDestinationMarker(destinationRef.current);
        getDirections(loc.lat(), loc.lng());
      }
    });
  };

  const placeDestinationMarker = (destination) => {
    const gmaps = window.google.maps;
    if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);
    destinationMarkerRef.current = new gmaps.Marker({
      position: destination,
      map: mapRefObject.current,
      title: "Destination",
      icon: { url: destpin, scaledSize: new gmaps.Size(40, 40) }
    });
  };

  const getDirections = (destLat, destLng) => {
    const gmaps = window.google.maps;
    const map = mapRefObject.current;
    if (!latLngRef.current || !map) return;

    const start = new gmaps.LatLng(latLngRef.current.lat, latLngRef.current.lng);
    const end = new gmaps.LatLng(destLat, destLng);
    destinationRef.current = { lat: destLat, lng: destLng };

    const directionsService = new gmaps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new gmaps.DirectionsRenderer({
        polylineOptions: { strokeColor: "#003366", strokeOpacity: 0.9, strokeWeight: 6 }
      });
    }

    directionsRendererRef.current.setMap(map);
    directionsRendererRef.current.set('directions', null);

    directionsService.route({ origin: start, destination: end, travelMode: gmaps.TravelMode[routeType] }, (result, status) => {
      if (status === gmaps.DirectionsStatus.OK) {
        directionsRendererRef.current.setDirections(result);
        infowindowRef.current?.close();
        const leg = result.routes[0].legs[0];
        setRouteSummary(`${leg.distance.text}, ${leg.duration.text}`);

        const bounds = new gmaps.LatLngBounds();
        result.routes[0].overview_path.forEach(p => bounds.extend(p));
        map.fitBounds(bounds);

        startProximityWatcher();
      } else {
        alert("Could not get directions: " + status);
      }
    });
  };

  const watcherIdRef = useRef(null);

  const startProximityWatcher = () => {
    const gmaps = window.google.maps;

    if (watcherIdRef.current !== null) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
    }

    const watchId = navigator.geolocation.watchPosition(async (pos) => {
      const userPos = new gmaps.LatLng(pos.coords.latitude, pos.coords.longitude);
      const destPos = new gmaps.LatLng(destinationRef.current.lat, destinationRef.current.lng);
      const distance = gmaps.geometry.spherical.computeDistanceBetween(userPos, destPos);

      if (!restaurantDetails || !restaurantDetails.name || restaurantDetails.name === 'Unknown') return;

      if (distance < 100 && !hasPrompted.current) {
        hasPrompted.current = true;
        const alreadyVisited = await checkIfVisitedToday();
        if (!alreadyVisited) showRatingPrompt();
        navigator.geolocation.clearWatch(watchId);
      }
    }, undefined, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000
    });

    watcherIdRef.current = watchId;
  };

  const checkIfVisitedToday = async () => {
    if (!user || !restaurantDetails?.name) return false;

    const visitsRef = collection(db, `visitHistory/${user.uid}/visits`);
    const snapshot = await getDocs(visitsRef, { source: 'server' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const visitDate = data.timestamp?.toDate?.() || new Date(data.timestamp);
      visitDate.setHours(0, 0, 0, 0);

      if (visitDate.getTime() === today.getTime() && data.placeName === restaurantDetails.name) {
        return true;
      }
    }
    return false;
  };

  const showRatingPrompt = () => {
    if (!restaurantDetails || !restaurantDetails.name) return;
    setShowModal(true);
  };

  const handleRatingSubmit = () => {
    if (pendingRating === 1 || pendingRating === 0) {
      submitRating(pendingRating);
      visitedTodayRef.current.add(restaurantDetails.name);
      setShowModal(false);
      setPendingRating(null);
    }
  };

  const submitRating = async (rating) => {
    if (!user || !restaurantDetails) return;

    const now = new Date();
    const visitRef = doc(db, `visitHistory/${user.uid}/visits/${Date.now()}`);

    await setDoc(visitRef, {
      userId: user.uid,
      placeName: restaurantDetails.name,
      address: restaurantDetails.address,
      cuisine: restaurantDetails.cuisine,
      allCuisines: Array.isArray(restaurantDetails.cuisine)
        ? restaurantDetails.cuisine
        : (restaurantDetails.cuisine || "")
          .split(',')
          .map(c => c.trim())
          .filter(Boolean),
      rating,
      timestamp: now,
      lat: destinationRef.current.lat,
      lng: destinationRef.current.lng
    });


    alert('✅ Thanks for rating!');
  };

  const clearRoute = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current.set('directions', null);
      directionsRendererRef.current = null;
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
      destinationMarkerRef.current = null;
    }
    destinationRef.current = null;
    setRouteSummary(null);
  };

  return (
    <div className="container-fluid text-center">
      <div className="row align-items-center position-relative">
        <div className="col-auto" onClick={goToHome} style={{ cursor: 'pointer' }}>
          <img src={back} alt="Back" style={{ width: '2rem', height: '2rem', margin: '10px' }} />
        </div>
        <div className="col text-center">
          <h2 className="m-0">Map</h2>
        </div>
        <div className="col-auto" onClick={goToProfile} style={{ cursor: 'pointer' }}>
          <img src={profileImg} alt="UserProfile" style={{ width: '2rem', height: '2rem', margin: '10px' }} />
        </div>
      </div>
      <hr />

      <div className="row" style={{ height: '85vh' }}>
        <div className="col-md-4 border-end p-3 text-start bg-light overflow-auto">
          <h4>Restaurant Details</h4>
          {restaurantDetails ? (
            <>
              {restaurantDetails.photo && (
                <img src={restaurantDetails.photo ? restaurantDetails.photo : diningImg} alt="Restaurant" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
              )}
              <h5>{restaurantDetails.name}</h5>
              <p><strong>Address:</strong> {restaurantDetails.address}</p>
              <p><strong>Rating:</strong> {restaurantDetails.rating} ⭐</p>
              <div>
                <strong>Cuisine:</strong>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {Array.isArray(restaurantDetails.cuisine)
                    ? restaurantDetails.cuisine.map((tag, i) => (
                      <span key={i} className="badge bg-dark">{tag}</span>
                    ))
                    : <span>{restaurantDetails.cuisine}</span>}
                </div>
              </div>
              {routeSummary && <p><strong>ETA:</strong> {routeSummary}</p>}
              <hr />
              <button className="btn btn-dark w-100 mb-2" onClick={() => getLocation(false, true)}>📍 Locate Me</button>
              <select className="form-select mb-2" value={routeType} onChange={(e) => setRouteType(e.target.value)}>
                <option value="DRIVING">Driving</option>
                <option value="WALKING">Walking</option>
                <option value="BICYCLING">Bicycling</option>
                <option value="TRANSIT">Transit</option>
              </select>
              <button className="btn btn-outline-danger w-100" onClick={clearRoute}>🧹 Clear Route</button>
            </>
          ) : <p>Loading restaurant info...</p>}
        </div>

        <div className="col-md-8 position-relative">
          <div ref={mapRef} className='rounded' style={{ height: "100%", width: "100%", border: '2px solid black' }}></div>
        </div>

        {showModal && (
          <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Rate {restaurantDetails?.name}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body text-center">
                  <p>Did you enjoy this place?</p>
                  <button
                    className={`btn btn-lg m-2 ${pendingRating === 1 ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setPendingRating(1)}
                  >
                    👍
                  </button>
                  <button
                    className={`btn btn-lg m-2 ${pendingRating === 0 ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setPendingRating(0)}
                  >
                    👎
                  </button>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button
                    className="btn btn-success"
                    onClick={handleRatingSubmit}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MapComponent;