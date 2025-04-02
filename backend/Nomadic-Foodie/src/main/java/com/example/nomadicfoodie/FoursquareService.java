package com.example.nomadicfoodie;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FoursquareService {

    @Value("${foursquare.api.key}")
    private String apiKey;

    private final String BASE_URL = "https://api.foursquare.com/v3/places/search";

    public Map<String, Object> fetchNearby(double lat, double lng) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", apiKey);

        Map<String, String> params = new HashMap<>();
        params.put("ll", lat + "," + lng);
        params.put("radius", "10000");
        params.put("categories", "13065");
        params.put("limit", "20");
        params.put("sort", "DISTANCE");

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(BASE_URL + buildQuery(params), HttpMethod.GET, entity, Map.class);

        List<Map<String, Object>> rawResults = (List<Map<String, Object>>) response.getBody().get("results");

        List<Map<String, Object>> results = rawResults.stream().map(place -> {
            Map<String, Object> geocodes = (Map<String, Object>) ((Map<String, Object>) place.get("geocodes")).get("main");
            Map<String, Object> location = (Map<String, Object>) place.get("location");

            Map<String, Object> result = new HashMap<>();
            result.put("name", place.get("name"));
            result.put("address", location.get("formatted_address"));
            result.put("position", Map.of("lat", geocodes.get("latitude"), "lng", geocodes.get("longitude")));
            result.put("cuisine", ((List<Map<String, Object>>) place.get("categories"))
                    .stream()
                    .map(cat -> cat.get("name").toString())
                    .collect(Collectors.joining(", ")));
            result.put("distance", String.format("%.2f", ((Number) place.get("distance")).doubleValue() / 1000));
            return result;
        }).toList();

        return Map.of("restaurants", results);
    }

    public Map<String, Object> fetchCuisine(double lat, double lng) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", apiKey);

        Map<String, String> params = new HashMap<>();
        params.put("ll", lat + "," + lng);
        params.put("radius", "50");
        params.put("categories", "13065");
        params.put("limit", "1");
        params.put("sort", "DISTANCE");

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(BASE_URL + buildQuery(params), HttpMethod.GET, entity, Map.class);

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody().get("results");
        if (results.isEmpty()) {
            return Map.of("cuisine", "Unknown Cuisine");
        }

        List<String> cuisineNames = ((List<Map<String, Object>>) results.get(0).get("categories"))
                .stream()
                .map(cat -> cat.get("name").toString())
                .toList();

        return Map.of("cuisine", String.join(", ", cuisineNames));
    }

    private String buildQuery(Map<String, String> params) {
        return "?" + params.entrySet()
                .stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
    }
}
