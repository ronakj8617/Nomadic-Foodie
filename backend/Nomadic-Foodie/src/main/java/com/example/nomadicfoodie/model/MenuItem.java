package com.example.nomadicfoodie.model;

import lombok.Data;

@Data
public class MenuItem {
    private String name;
    private double price;
    private String description;
    private String category;
    private boolean isVeg;

    public boolean isVeg() {
        return isVeg;
    }

    public void setVeg(boolean veg) {
        this.isVeg = veg;
    }
}

