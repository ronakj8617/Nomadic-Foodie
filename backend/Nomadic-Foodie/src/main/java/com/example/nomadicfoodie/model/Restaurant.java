package com.example.nomadicfoodie.model;

import lombok.Data;
import java.util.Map;

@Data
public class Restaurant {
    private String id;
    private String name;
    private String address;
    private String cuisine;
    private String photo;
    private Map<String, Object> location;
}
