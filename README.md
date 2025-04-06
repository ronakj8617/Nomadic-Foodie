# Nomadic Foodie

An ML-powered web app that suggests restaurants based on user's spending and cuisine preference. Users can find, locate, and read menus and find routes (driving, walking, transit, and bicycle) to the restaurants and when reach can give reviews which the ML model will use for recommendations. Restaurants can list their businesses, add menus, and have a dashboard that shows the data about their businesses.

## Features

- **User Authentication**: Secure login and registration for individuals(foodies) and restaurants.
- **Nearby Restaurants**: If a foodie opens the map screen from the home screen, they will be displayed the nearest restaurant.
- **Dining**: Lists the restaurants according to the user's spending and cuisine preferences using an ML model. Also displays the menus and locations of the selected restaurants.
- **Restaurant Menus**: Allows restaurants to modify their menus and updates the data on users' screens in real-time.
- **History**: Provides details of user's visits to restaurants in the past. Also displays locations on the map.
- **Dashboard**: Displays the ratings provided by users and users' traffic data.
- **Profile**: Foodies and restaurants can update their  profiles. Additional feature for restaurants to update location as well in case of relocation.
## Technologies Used

```
- Spring Boot
- REST APIs
- ModelMapper, DTO
- JPA
- React
- Bootstrap 4
- Firebase
- Docker
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ronakj8617/Nomadic-Foodie.git
```

### 2. Navigate to the Project Directory

```bash
cd Nomadic-Foodie
```

### 3. Start backend services

```bash
cd backend
gradle bootrun
```

### 4. Start frontend application

```bash
cd frontend
npm install
npm start

```
