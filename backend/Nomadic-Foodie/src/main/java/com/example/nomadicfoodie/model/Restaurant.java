package com.example.nomadicfoodie.model;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class Restaurant {
    private String id;

    private String name;
    private String email;
    private String contact;
    private String photo;
    private String priceLevel;
    private String role;
    private String address;

    private Object rating;
    private Object latitude;
    private Object longitude;

    private List<String> cuisines;
    private Map<String, Object> location;
}
