// components/routes/AppRoutes.js
import { Routes, Route, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Login from "../Auth/Login";
import Bookmarks from "../Pages/Bookmarks";
import AddRecipe from "../Pages/AddRecipe";
import PrivateRoute from "../Layout/PrivateRoute";
import FoodERPLayout from "../Layout/FoodERPLayout";
import FoodERPRoutes from "./FoodERPRoutes";
import QRMenuPage from "../Pages/Menu/QRMenuPage"; // ← NEW public QR menu

const AppRoutes = ({ isAuthenticated, currentUser, onLogout }) => {
  return (
    <>
      <Helmet>
        <title>Klyro ERP — Business Management Platform</title>
      </Helmet>

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/fooderp/dashboard" /> : <Login />
          }
        />

        {/* ── PUBLIC QR MENU PAGE — no auth required ──────────────────────── */}
        {/* URL: /menu/:menuId?branchId=X                                      */}
        {/* Customers land here after scanning the QR code from the restaurant */}
        <Route path="/menu/:menuId" element={<QRMenuPage />} />

        {/* PROTECTED FORKIFY ROUTES */}
        <Route
          path="/bookmarks"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Bookmarks />
            </PrivateRoute>
          }
        />

        <Route
          path="/add-recipe"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <AddRecipe />
            </PrivateRoute>
          }
        />

        {/* PROTECTED FOODERP ROUTES */}
        <Route
          path="/fooderp/*"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <FoodERPLayout
                currentUser={currentUser}
                onLogout={onLogout}
                isAuthenticated={isAuthenticated}
              />
            </PrivateRoute>
          }
        >
          {/* Nested routes inside FoodERPLayout */}
          <Route path="*" element={<FoodERPRoutes />} />
        </Route>

        {/* REDIRECT FOR UNKNOWN ROUTES */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
