import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import profileImg from './assets/profile.png';
import { auth } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import locImg from './assets/location.png';
import restImg from './assets/restaurant.png';
import locHistImg from './assets/location-history.png';

function App() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const goToMap = () => navigate('/map');
  const goToProfile = () => navigate('/UserProfile');
  const goToHistory = () => navigate('/history');
  const goToNearByRestaurantsList = () => navigate('/nearbyrestaurantslist');

  if (!authChecked) {
    return <div className="text-center mt-5">Checking authentication...</div>;
  }

  return (
    
    <div className="container text-center">

      <div className="container text-center">

        <div className="row align-items-center position-relative" style={{ marginTop: '20px' }}>


          <div className="col text-center">
            <h2 className="m-0">Nomadic Foodie</h2>
          </div>

          <div className="col-auto" style={{ cursor: 'pointer' }}>
            <img src={profileImg} style={{ width: '2rem', height: '2rem', margin: '10px' }} alt="UserProfile" onClick={goToProfile} />
          </div>
        </div>

        <div className="d-flex justify-content-center mt-5">
          <div className="row" style={{ maxWidth: '1000px' }}>
            <div className='col-md-4 d-flex justify-content-center mb-4' onClick={goToMap} style={{ cursor: 'pinter' }}>
              <div className='card' style={{ width: '20rem', height: '25rem', cursor: 'pointer' }}>
                <div className='card-body d-flex flex-column justify-content-center align-items-center'>
                  <h4 className='text-center mb-4'>Map</h4>
                  <img src={locImg} alt="Placeholder" style={{ width: '2rem', height: '2rem' }} />
                </div>
              </div>
            </div>

            <div className='col-md-4 d-flex justify-content-center mb-4' onClick={goToNearByRestaurantsList} style={{ cursor: 'pointer' }} >
              <div className='card' style={{ width: '20rem', height: '25rem' }}>
                <div className='card-body d-flex flex-column justify-content-center align-items-center'>
                  <h4 className='text-center mb-4'>Dining</h4>
                  <img src={restImg} alt="Placeholder" style={{ width: '2rem', height: '2rem' }} />
                </div>
              </div>
            </div>

            <div className='col-md-4 d-flex justify-content-center mb-4' onClick={goToHistory} style={{ cursor: 'pointer' }}>
              <div className='card' style={{ width: '20rem', height: '25rem' }}>
                <div className='card-body d-flex flex-column justify-content-center align-items-center'>
                  <h4 className='text-center mb-4'>History</h4>
                  <img src={locHistImg} alt="Placeholder" style={{ width: '2rem', height: '2rem' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}

export default App;
