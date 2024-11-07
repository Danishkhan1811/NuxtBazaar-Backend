# NuxtBazaar-Backend

## Description
NuxtBazaar-Backend is a backend application designed to support the NuxtBazaar e-commerce platform. It provides a robust API for managing products, users, and orders, ensuring seamless integration with the frontend application built using Nuxt.js.

## Table of Contents
- [API Endpoints](#api-endpoints)
- [Installation](#installation)
- [Usage](#usage)

## API Endpoints
Here are some of the key API endpoints available in NuxtBazaar-Backend:
- GET /api/products: Retrieve a list of all products.
- POST /api/products: Add a new product.
- GET /api/users: Retrieve user information.
- POST /api/orders: Create a new order.

## Installation
To set up the NuxtBazaar-Backend locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Danishkhan1811/NuxtBazaar-Backend.git

2. Navigate to the project directory:
   ```bash
   cd NuxtBazaar-Backend

3. Install the required dependencies:
   ```bash
   npm install

4. Create a .env file in the root directory and configure your environment variables as needed.

5. Start the development server:
   ```bash
   npm run dev

## Usage
Once the server is running, you can access the API endpoints to manage products, users, and orders. Use tools like Postman or cURL to interact with the API.

## Example Request
To get a list of products:
```base
curl -X GET http://localhost:3000/api/products
