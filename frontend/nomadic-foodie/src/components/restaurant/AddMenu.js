import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebaseconfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function AddMenu() {
  const navigate = useNavigate();
  const [menuItem, setMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    isVeg: true
  });
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    const fetchMenu = async () => {
      const user = auth.currentUser;
      if (!user) return navigate('/login');

      const docRef = doc(db, 'restaurant-menus', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.menu) {
          setMenu(data.menu);
        }
      }
    };

    fetchMenu();
  }, [navigate]);

  const handleChange = (e) => {
    setMenuItem({ ...menuItem, [e.target.name]: e.target.value });
  };

  const handleVegToggle = (e) => {
    setMenuItem({ ...menuItem, isVeg: e.target.value === 'veg' });
  };

  const handleAddItem = () => {
    const { name, description, price } = menuItem;
    if (!name || !description || !price) {
      alert("Name, description, and price are required.");
      return;
    }

    setMenu([...menu, { ...menuItem, price: parseFloat(menuItem.price) }]);
    setMenuItem({ name: '', description: '', price: '', category: '', isVeg: true });
  };

  const handleSaveMenu = async () => {
    const user = auth.currentUser;
    if (!user) return navigate('/login');

    const docRef = doc(db, 'restaurant-menus', user.uid);
    try {
      await setDoc(docRef, { menu });
      alert("Menu saved successfully!");
      navigate('/restauranthome');
    } catch (err) {
      console.error("Error saving menu:", err.message);
      alert("Failed to save menu.");
    }
  };

  const removeItem = (index) => {
    const updatedMenu = [...menu];
    updatedMenu.splice(index, 1);
    setMenu(updatedMenu);
  };

  return (
    <div className="container py-5">
      <div className="card p-4 shadow border-dark">
        <h3 className="text-center mb-4">Add Menu Items</h3>

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <input
              name="name"
              type="text"
              className="form-control border-dark"
              placeholder="Item Name"
              value={menuItem.name}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <input
              name="description"
              type="text"
              className="form-control border-dark"
              placeholder="Description"
              value={menuItem.description}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <input
              name="price"
              type="number"
              step="0.01"
              className="form-control border-dark"
              placeholder="Price"
              value={menuItem.price}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <input
              name="category"
              type="text"
              className="form-control border-dark"
              placeholder="Category"
              value={menuItem.category}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <select className="form-select border-dark" value={menuItem.isVeg ? 'veg' : 'nonveg'} onChange={handleVegToggle}>
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
            </select>
          </div>
        </div>

        <div className="d-grid mb-4">
          <button className="btn btn-dark" onClick={handleAddItem}>
            Add Item to Menu
          </button>
        </div>

        <h5 className="mb-3">Current Menu</h5>
        {menu.length === 0 ? (
          <p className="text-muted">No items added yet.</p>
        ) : (
          <ul className="list-group mb-4">
            {menu.map((item, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>{item.name}</strong> – ₹{item.price.toFixed(2)}<br />
                  <small>{item.description}</small>
                  {item.category && <span className="ms-2 badge bg-secondary">{item.category}</span>}
                  <span className={`ms-2 badge ${item.isVeg ? 'bg-success' : 'bg-danger'}`}>
                    {item.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>
                </div>
                <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(index)}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div className="d-grid">
          <button className="btn btn-success" onClick={handleSaveMenu}>
            Save Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddMenu;
