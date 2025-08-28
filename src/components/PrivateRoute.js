import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    //  Không có token → chuyển về trang login
    return <Navigate to="/login" />;
  }

  // Có token → hiển thị component con
  return children;
}
