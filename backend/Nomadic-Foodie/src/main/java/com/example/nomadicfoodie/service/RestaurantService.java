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
        List<QueryDocumentSnapshot> docs = query.get().getDocuments();

        List<Restaurant> result = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            Restaurant r = doc.toObject(Restaurant.class);
            r.setId(doc.getId());
            result.add(r);
        }
        return result;
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
            m.setVeg(Boolean.TRUE.equals(item.get("isVeg")));
            items.add(m);
        }

        return items;
    }
}
