package com.example.nomadicfoodie.controller;

import com.example.nomadicfoodie.model.MenuItem;
import com.example.nomadicfoodie.model.Restaurant;
import com.example.nomadicfoodie.service.RestaurantService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@CrossOrigin(origins = "*") // allow frontend access
public class RestaurantController {

    private final RestaurantService service;

    public RestaurantController(RestaurantService service) {
        this.service = service;
    }

    @GetMapping
    public List<Restaurant> getAllRestaurants() throws Exception {
        return service.getAllRestaurants();
    }

    @GetMapping("/{id}/menu")
    public List<MenuItem> getMenu(@PathVariable String id) throws Exception {
        return service.getMenuByRestaurantId(id);
    }
}
