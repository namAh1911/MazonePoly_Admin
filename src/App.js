import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AdminLayout from "./layouts/AdminLayout";
import PrivateRoute from "./components/PrivateRoute";
import ProductAdd from "./pages/ProductAdd";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import Sizes from "./pages/Sizes";
import Descriptions from "./pages/Descriptions";
import ProductDetail from "./pages/ProductDetail";
import ProductEdit from "./pages/ProductEdit";
import ForgotPassword from "./pages/ForgotPassword";
import CustomerList from "./pages/CustomerList";
import CustomerDetail from "./pages/CustomerDetail";
import OrderList from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import ProductStatistics from "./pages/ProductStatistics";
import OrderStatistics from "./pages/OrderStatistics";
import InventoryStatistics from "./pages/InventoryStatistics";
import AdminChatDashboard from "./pages/AdminChatDashboard";
import ChangePassword from "./pages/ChangePassword";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin routes - được bảo vệ */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <AdminLayout>
                <Products />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/products/add"
          element={
            <AdminLayout>
              <ProductAdd />
            </AdminLayout>
          }
        />
        <Route
          path="/categories"
          element={
            <AdminLayout>
              <Categories />
            </AdminLayout>
          }
        />
        <Route
          path="/brands"
          element={
            <AdminLayout>
              <Brands />
            </AdminLayout>
          }
        />
        <Route
          path="/sizes"
          element={
            <AdminLayout>
              <Sizes />
            </AdminLayout>
          }
        />
        <Route
          path="/descriptions"
          element={
            <AdminLayout>
              <Descriptions />
            </AdminLayout>
          } />
        <Route path="/products/:id"
          element={
            <AdminLayout>
              <ProductDetail />
            </AdminLayout>
          } />
        <Route path="/products/edit/:id"
          element={
            <AdminLayout>
              <ProductEdit />
            </AdminLayout>
          } />

        <Route path="/customers"
          element={
            <AdminLayout>
              <CustomerList />
            </AdminLayout>
          } />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <AdminLayout>
                <AdminChatDashboard />
              </AdminLayout>
            </PrivateRoute>
          }
        />

        <Route path="/admin/customers/:id"
          element={
            <AdminLayout>
              <CustomerDetail />
            </AdminLayout>

          } />
        <Route
          path="/orders"
          element={
            <AdminLayout>
              <OrderList />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <AdminLayout>
              <OrderDetail />
            </AdminLayout>
          }
        />
        <Route
          path="/statistics/products"
          element={
            <AdminLayout>
              <ProductStatistics />
            </AdminLayout>
          }
        />
        <Route
          path="/statistics/orders"
          element={
            <AdminLayout>
              <OrderStatistics />
            </AdminLayout>
          }
        />
        <Route
          path="/statistics/inventory"
          element={
            <AdminLayout>
              <InventoryStatistics />
            </AdminLayout>
          }
        />
        <Route
          path="/change-password"
          element={
            <AdminLayout>
              <ChangePassword />
            </AdminLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
