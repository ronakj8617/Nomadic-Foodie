package com.example.nomadicfoodie;


import com.example.nomadicfoodie.FoursquareService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/foursquare")
@CrossOrigin(origins = "http://localhost:3000")
public class FoursquareController {

    @Autowired
    private FoursquareService foursquareService;

    @GetMapping("/nearby")
    public Map<String, Object> getNearby(@RequestParam double lat, @RequestParam double lng) {
        return foursquareService.fetchNearby(lat, lng);
    }

    @GetMapping("/cuisine")
    public Map<String, Object> getCuisine(@RequestParam double lat, @RequestParam double lng) {
        return foursquareService.fetchCuisine(lat, lng);
    }
}
