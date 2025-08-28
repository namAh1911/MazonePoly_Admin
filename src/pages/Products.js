import React, { useEffect, useState } from "react";
import axios from "axios";
import "./StyleWeb/Products.css";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import ProductCard from "../components/ProductCard";
import { BASE_URL } from "../config";
import { Modal, Button, Input } from "antd";

export default function Products({ onResults }) {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockRows, setRestockRows] = useState([]); // {color,size,currentQty,addQty}

  // state cho modal xoá
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("");

  // mở modal khi click xoá
  const openDeleteModal = (prod) => {
    setDeleteTarget(prod);
    setConfirmText("");
    setDeleteOpen(true);
  };


  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/products`);
      setProducts(res.data);
    } catch (err) {
      console.error("Lỗi tải sản phẩm", err);
    }
  };
  const handleSearch = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/products/search`, {
        params: {
          name: keyword,   // đúng với backend
          // category: nếu muốn lọc theo danh mục thì thêm
          sort: sort,      // cái này backend chưa xử lý, sẽ nói thêm bên dưới
        },
      });
      setProducts(res.data);
      if (onResults) onResults(res.data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };



  // Hàm toggle trạng thái nổi bật
  const handleToggleFeatured = async (id) => {
    try {
      const res = await axios.put(`${BASE_URL}/api/products/${id}/featured`);
      const updatedFeatured = res.data.is_featured;
      alert("Cập nhật trạng thái nổi bật thành công");
      // Cập nhật lại danh sách sản phẩm trong state
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, is_featured: updatedFeatured } : p))
      );
    } catch (error) {
      alert("Cập nhật trạng thái nổi bật thất bại");
      console.error(error);
    }
  };

  // gọi API xoá
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${BASE_URL}/api/products/${deleteTarget._id}`);
      setProducts((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      setDeleteOpen(false);
      alert("✅ Đã xoá sản phẩm vĩnh viễn!");
    } catch (err) {
      console.error("Lỗi xoá sản phẩm", err);
      alert("⚠️ Không thể xoá sản phẩm");
    }
  };

  const openRestock = (prod) => {
    setRestockTarget(prod);
    // nếu có variations: build rows; nếu không: 1 ô quantity chung
    if (Array.isArray(prod.variations) && prod.variations.length > 0) {
      setRestockRows(
        prod.variations.map(v => ({
          color: v.color,
          size: v.size,
          currentQty: v.quantity,
          addQty: ""
        }))
      );
    } else {
      setRestockRows([{ color: "", size: "", currentQty: prod.quantity || 0, addQty: "" }]);
    }
    setRestockOpen(true);
  };

  const submitRestock = async () => {
    try {
      if (!restockTarget) return;

      if (Array.isArray(restockTarget.variations) && restockTarget.variations.length > 0) {
        // gom các item có addQty > 0
        const items = restockRows
          .filter(r => Number(r.addQty) > 0)
          .map(r => ({ color: r.color, size: r.size, quantity: Number(r.addQty) }));
        if (items.length === 0) {
          alert("Nhập số lượng > 0 cho ít nhất một biến thể.");
          return;
        }
        const res = await axios.post(`${BASE_URL}/api/products/${restockTarget._id}/restock`, { items });
        // cập nhật lại list
        setProducts(prev => prev.map(p => p._id === res.data._id ? res.data : p));
      } else {
        const addQty = Number(restockRows[0]?.addQty);
        if (!Number.isFinite(addQty) || addQty <= 0) {
          alert("Nhập số lượng > 0.");
          return;
        }
        const res = await axios.post(`${BASE_URL}/api/products/${restockTarget._id}/restock`, { quantity: addQty });
        setProducts(prev => prev.map(p => p._id === res.data._id ? res.data : p));
      }
      alert("✅ Nhập hàng thành công!");
      setRestockOpen(false);
    } catch (err) {
      console.error(err);
      alert("Nhập hàng thất bại");
    }
  };

  return (
    <div className="product-page">
      {/* Modal xác nhận xoá */}
      <Modal
        title="Xác nhận xóa sản phẩm"
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDeleteOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="delete"
            danger
            disabled={confirmText !== "XÓA"}
            onClick={handleDelete}
          >
            Xóa vĩnh viễn
          </Button>,
        ]}
      >
        <p>
          Bạn có chắc chắn muốn xóa sản phẩm{" "}
          <b>{deleteTarget?.name}</b> không? <br />
          Hành động này sẽ xóa <b>vĩnh viễn</b> khỏi hệ thống, bao gồm cả dữ liệu
          trong thống kê và <b>không thể hoàn tác</b>.
        </p>
        <p>Vui lòng gõ <b>XÓA</b> vào ô bên dưới để xác nhận:</p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Nhập XÓA để xác nhận"
        />
      </Modal>
      {restockOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Nhập hàng: {restockTarget?.name}</h3>

            {Array.isArray(restockTarget?.variations) && restockTarget.variations.length > 0 ? (
              <table className="restock-table">
                <thead>
                  <tr>
                    <th>Màu</th>
                    {/* Lấy unique size từ variations */}
                    {[...new Set(restockTarget.variations.map(v => v.size))].map(size => (
                      <th key={size}>{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Group theo màu */}
                  {[...new Set(restockTarget.variations.map(v => v.color))].map(color => (
                    <tr key={color}>
                      <td>{color}</td>
                      {[...new Set(restockTarget.variations.map(v => v.size))].map(size => {
                        const rowIndex = restockRows.findIndex(r => r.color === color && r.size === size);
                        const row = restockRows[rowIndex];
                        return (
                          <td key={size} style={{ textAlign: "center" }}>
                            <div>
                              <div>Tồn: {row?.currentQty ?? 0}</div>
                              <input
                                type="number"
                                min={0}
                                value={row?.addQty || ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setRestockRows(rows =>
                                    rows.map((r, i) =>
                                      i === rowIndex ? { ...r, addQty: v } : r
                                    )
                                  );
                                }}
                                style={{ width: 60, marginTop: 4 }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div>Tồn hiện tại: <b>{restockRows[0]?.currentQty || 0}</b></div>
                <div>
                  Nhập thêm:{" "}
                  <input
                    type="number"
                    min={0}
                    value={restockRows[0]?.addQty}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRestockRows(rows => [{ ...rows[0], addQty: v }]);
                    }}
                    style={{ width: 120 }}
                  />
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setRestockOpen(false)}>Hủy</button>
              <button className="btn-primary" onClick={submitRestock}>Xác nhận nhập hàng</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", marginBottom: "10px", padding: "7px", borderRadius: "10px" }}>
        <div className="product-header">
          <h2>Quản Lý Sản Phẩm</h2>
          <button className="btn-add" onClick={() => navigate("/products/add")}>
            + Thêm sản phẩm mới
          </button>
        </div>

        <div className="product-search">
          <input
            name="ip-search"
            placeholder="...Tìm theo tên sản phẩm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">-Sắp xếp-</option>
            <option value="name_asc">Tên A-Z</option>
            <option value="name_desc">Tên Z-A</option>
            <option value="price_asc">Giá tăng</option>
            <option value="price_desc">Giá giảm</option>
          </select>
          <button className="btn-search" onClick={handleSearch}>
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="product-scroll-container">
        <div className="product-list">
          {products.map((prod) => (
            <div className="product-card" key={prod._id}>
              <ProductCard key={prod._id} product={prod} />
              <div className="product-info">
                <h3>{prod.name}</h3>

                <div className="info-boxes">
                  <div className="box">
                    <p>Danh mục: {prod.category}</p>
                    <p>Thương hiệu: {prod.brand}</p>
                    <p>Giá bán: {prod.price?.toLocaleString()}₫</p>

                  </div>
                </div>
                {/* Thêm icon trạng thái nổi bật */}
                <span
                  className={prod.is_featured ? "badge badge-featured" : "badge badge-normal"}
                  onClick={() => handleToggleFeatured(prod._id)}
                >
                  {prod.is_featured ? "NỔI BẬT" : "THƯỜNG"}
                </span>

                <div className="actions">
                  <span className={`status ${prod.status === "Đang bán" ? "in-stock" :
                    prod.status === "Hết hàng" ? "out-of-stock" :
                      "stopped"
                    }`}>
                    {prod.status === "Đang bán" && "🟢 Đang bán"}
                    {prod.status === "Hết hàng" && "🔴 Hết hàng"}
                    {prod.status === "Ngừng bán" && "⚪ Ngừng bán"}
                  </span>


                  <div className="icons" style={{ marginLeft: "15px" }}>
                    <FaEye
                      title="Xem chi tiết"
                      style={{ cursor: "pointer", color: "green" }}
                      onClick={() => navigate(`/products/${prod._id}`, { state: { reload: true } })}
                    />
                    <FaEdit
                      title="Sửa"
                      style={{ cursor: "pointer", color: "blue" }}
                      onClick={() => navigate(`/products/edit/${prod._id}`)}
                    />
                    <FaTrash
                      title="Xoá vĩnh viễn"
                      onClick={() => openDeleteModal(prod)}
                      style={{ color: "red", cursor: "pointer" }}
                    />
                  </div>
                  <button className="btn-import" onClick={() => openRestock(prod)}>Nhập hàng</button>
                </div>

                <div className="updated-date">
                  Cập nhật: {new Date(prod.updatedAt).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
