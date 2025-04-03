package com.example.nomadicfoodie.service;
import com.example.nomadicfoodie.model.MenuItem;

import com.example.nomadicfoodie.model.Restaurant;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class RestaurantService {

    public List<Restaurant> getAllRestaurants() throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> query = db.collection("restaurantDetails").get();
        List<QueryDocumentSnapshot> documents = query.get().getDocuments();

        List<Restaurant> restaurants = new ArrayList<>();

        for (QueryDocumentSnapshot doc : documents) {
            try {
                Restaurant restaurant = doc.toObject(Restaurant.class);
                restaurant.setId(doc.getId());

                double lat = safeDouble(restaurant.getLatitude());
                double lng = safeDouble(restaurant.getLongitude());

                restaurant.setLocation(Map.of("lat", lat, "lng", lng));
                restaurants.add(restaurant);
                restaurant.setLocation(Map.of("lat", lat, "lng", lng));
                restaurant.setAddress(doc.getString("address")); // Add this line
                restaurant.setRating(doc.getString("rating"));   // Already covered or add
                List<String> cuisines = (List<String>) doc.get("cuisines");
                restaurant.setCuisines(cuisines);

            } catch (Exception e) {
                System.err.println("🔥 Failed to parse restaurant document ID: " + doc.getId());
                e.printStackTrace(); // ✅ This should help pinpoint the exact issue
            }
        }

        return restaurants;
    }

    public List<MenuItem> getMenuByRestaurantId(String restaurantId) throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        DocumentSnapshot doc = db.collection("restaurant-menus").document(restaurantId).get().get();

        if (!doc.exists()) return new ArrayList<>();

        List<Map<String, Object>> menu = (List<Map<String, Object>>) doc.get("menu");
        List<MenuItem> items = new ArrayList<>();

        for (Map<String, Object> item : menu) {
            MenuItem m = new MenuItem();
            m.setName((String) item.get("name"));
            m.setPrice(Double.parseDouble(item.get("price").toString()));
            m.setDescription((String) item.get("description"));
            m.setCategory((String) item.get("category"));
            Object isVegRaw = item.get("isVeg");
            boolean isVeg = false;

            if (isVegRaw instanceof Boolean) {
                isVeg = (Boolean) isVegRaw;
            } else if (isVegRaw instanceof String) {
                isVeg = ((String) isVegRaw).equalsIgnoreCase("true");
            } else if (isVegRaw instanceof Number) {
                isVeg = ((Number) isVegRaw).intValue() == 1;
            }

            m.setVeg(isVeg);

            items.add(m);
        }

        return items;
    }

    double safeDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (Exception ignored) {}
        }
        return 0.0;
    }

}
