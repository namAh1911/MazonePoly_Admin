import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../config";
import { Avatar, Spin, Button, message, Tag } from "antd";
import moment from "moment";
import "./StyleWeb/CustomerDetail.css";

export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/api/admin/users/${id}`, {
                    withCredentials: true,
                });
                setUser(res.data.user);
            } catch (err) {
                message.error("Không tìm thấy người dùng");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    if (loading) return <Spin />;
    if (!user) return <div>Không tìm thấy người dùng.</div>;

    const genderText = (gender) => {
        switch (gender) {
            case 1: return "Nam";
            case 2: return "Nữ";
            case 3: return "Khác";
            default: return "Chưa chọn";
        }
    };

    const roleText = (role) => role === 0 ? "Admin" : "Khách hàng";

    return (
        <div className="customer-detail-container">
            <h2>Chi tiết tài khoản khách hàng</h2>
            <div className="detail-header">
                <Button onClick={() => navigate(-1)} type="primary">Quay lại</Button>
            </div>

            <div className="detail-avatar-section">
                <Avatar
                    src={user.avatar_url || "https://via.placeholder.com/100"}
                    size={100}
                    className="detail-avatar"
                />
            </div>

            <table className="detail-table">
                <tbody>
                    <tr><th>Họ tên</th><td>{user.full_name}</td></tr>
                    <tr><th>Email</th><td>{user.email}</td></tr>
                    <tr><th>SĐT</th><td>{user.phone_number || "Chưa có"}</td></tr>
                    <tr><th>Giới tính</th><td>{genderText(user.gender)}</td></tr>
                    <tr><th>Ngày sinh</th><td>{user.date_of_birth ? moment(user.date_of_birth).format("DD/MM/YYYY") : "Chưa cập nhật"}</td></tr>
                    <tr>
                        <th>Trạng thái</th>
                        <td>
                            <Tag color={user.status === 1 ? "green" : "red"}>
                                {user.status === 1 ? "Hoạt động" : "Bị khóa"}
                            </Tag>
                        </td>
                    </tr>
                    <tr><th>Vai trò</th><td>{roleText(user.role)}</td></tr>
                    <tr><th>Google ID</th><td>{user.google_id || "Không có"}</td></tr>
                    <tr><th>Ngày tạo</th><td>{moment(user.created_at).format("DD/MM/YYYY HH:mm")}</td></tr>
                    <tr><th>Cập nhật</th><td>{moment(user.updated_at).format("DD/MM/YYYY HH:mm")}</td></tr>
                </tbody>
            </table>
        </div>
    );
}
