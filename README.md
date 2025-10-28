# Anime Recommendation App (Next.js Frontend)

This is the official frontend for the Anime Recommendation App, built with Next.js and deployed on Vercel.

It provides a user-friendly interface for users to rate anime and receive personalized recommendations based on their ratings.

## 🚀 Live Demo

**Try the app live:** [**https://anime-recommendation-next-app.vercel.app/**](https://anime-recommendation-next-app.vercel.app/)

## ✨ Features

* **Browse & Search:** Find any anime from the database.
* **Rate Anime:** Give ratings to anime you've already watched to build your taste profile.
* **Get Recommendations:** Receive a custom list of anime recommendations based on the ratings you've provided.

## 🛠️ How It Works (Architecture)

This is a decoupled frontend application that works by communicating with a separate, deployed machine learning backend.

* **Frontend:** A **Next.js (React)** application that handles all user interaction and UI.
* **Backend (ML Model):** This app fetches recommendations by making API calls to a **FastAPI** server, which hosts the trained ML model. The backend is located in a separate repository and is deployed on Render.
* **Deployment:** The Next.js app is continuously deployed on **Vercel**.

## 🔗 Related Repositories

* **MLOps & Backend API:** [FrienDotJava/anime-recommendation-app](https://github.com/FrienDotJava/anime-recommendation-app)
* **Live Model API Docs:** [https://fastapi-example-265p.onrender.com/docs](https://fastapi-example-265p.onrender.com/docs)

## 📦 Running Locally

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/FrienDotJava/anime-recommendation-next-app.git](https://github.com/FrienDotJava/anime-recommendation-next-app.git)
    cd anime-recommendation-next-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

4.  **Open your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000). The app will run locally and make requests to the live, deployed FastAPI backend.
