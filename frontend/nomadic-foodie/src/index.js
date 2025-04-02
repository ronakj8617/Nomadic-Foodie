// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import MapComponent from './components/foodie/MapComponent';
import UserProfile from './components/foodie/UserProfile';
import UserSignUp from './components/foodie/UserSignUp';
import NearbyRestaurantsList from './components/foodie/NearByRestaurantsList';
import VisitHistory from './components/foodie/VisitHistory';
import UserHome from './components/foodie/UserHome';

import Login from './components/Login';

import Registration from './components/Registration';
import RestaurantsSignUp from './components/restaurant/RestaurantsSignUp';
import RestaurantHome from './components/restaurant/RestaurantHome';
import RestaurantProfile from './components/restaurant/RestaurantProfile';
import AddMenu from './components/restaurant/AddMenu';
import 'leaflet/dist/leaflet.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/map" element={<MapComponent />} />
      <Route path="/UserProfile" element={<UserProfile />} />
      <Route path="/usersignup" element={<UserSignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/history" element={<VisitHistory />} />
      <Route path="/nearbyrestaurantslist" element={<NearbyRestaurantsList />} />
      <Route path="/registration" element={<Registration />} />
      <Route path='restaurantsignup' element={<RestaurantsSignUp/>} />
      <Route path='/restaurantHome' element={<RestaurantHome />} />
      <Route path='/userHome' element={<UserHome />} />
      <Route path='/restaurantProfile' element={<RestaurantProfile />} />
      <Route path="/addmenu" element={<AddMenu />} />

      </Routes>
  </HashRouter>

);
