import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Loading from "./components/Loading";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import ProductDetails from "./pages/ProductDetails";
import MyRentals from "./pages/MyRentals";
import RoleRoute from "./components/RoleRoute";
import VendorProducts from "./pages/VendorProducts";
import VendorRentals from "./pages/VendorRentals";
import Revenue from "./pages/Revenue";
import Profile from "./pages/Profile";
import MyChats from "./pages/MyChats";
import Spending from "./pages/Spending";

// Protected route wrapper
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { user } = useAuth();

  const getDashboardComponent = () => {
    if (!user) return <Navigate to="/login" />;
    switch (user.role) {
      case "admin":
        return <AdminDashboard />;
      case "vendor":
        return <VendorDashboard />;
      case "customer":
        return <CustomerDashboard />;
      default:
        return <Navigate to="/products" />;
    }
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <Layout>
            <Products />
          </Layout>
        }
      />
      <Route
        path="/products"
        element={
          <Layout>
            <Products />
          </Layout>
        }
      />
      <Route
        path="/products/:id"
        element={
          <Layout>
            <ProductDetails />
          </Layout>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>{getDashboardComponent()}</Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Layout>
              <Profile />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Role-specific routes */}
      <Route
        path="/products/add"
        element={
          <RoleRoute allowedRoles={["vendor"]}>
            <Layout>
              <AddProduct />
            </Layout>
          </RoleRoute>
        }
      />

      <Route
        path="/customer/rentals"
        element={
          <RoleRoute allowedRoles={["customer"]}>
            <Layout>
              <MyRentals />
            </Layout>
          </RoleRoute>
        }
      />

      {/* Vendor Management Routes */}
      <Route
        path="/vendor/products"
        element={
          <RoleRoute allowedRoles={["vendor"]}>
            <Layout>
              <VendorProducts />
            </Layout>
          </RoleRoute>
        }
      />

      <Route
        path="/vendor/products/:id/edit"
        element={
          <RoleRoute allowedRoles={["vendor"]}>
            <Layout>
              <AddProduct />
            </Layout>
          </RoleRoute>
        }
      />

      <Route
        path="/vendor/rentals"
        element={
          <RoleRoute allowedRoles={["vendor"]}>
            <Layout>
              <VendorRentals />
            </Layout>
          </RoleRoute>
        }
      />

      <Route
        path="/revenue"
        element={
          <RoleRoute allowedRoles={["vendor"]}>
            <Layout>
              <Revenue />
            </Layout>
          </RoleRoute>
        }
      />

      <Route
        path="/spending"
        element={
          <RoleRoute allowedRoles={["customer"]}>
            <Layout>
              <Spending />
            </Layout>
          </RoleRoute>
        }
      />

      {/* Chat Routes */}
      <Route
        path="/chats"
        element={
          <RoleRoute allowedRoles={["customer", "vendor"]}>
            <Layout>
              <MyChats />
            </Layout>
          </RoleRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <RoleRoute allowedRoles={["admin"]}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </RoleRoute>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
