import React, { useState, useEffect } from "react";
import { getStockData } from "../../api/stock/stock.ts";
import { getProducts } from "../../api/product/productApi.ts";
import { Link, useNavigate } from "react-router-dom"; // เพิ่ม useNavigate
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { jwtDecode } from "jwt-decode";
import { getWarehouses } from "../../api/product/warehousesApi.ts";
import { getCategories } from "../../api/product/categoryApi.ts";
import {
  faUserTie,
  faSearch,
  faEnvelope,
  faBriefcase,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/stock/StockPage.css";
interface StockItem {
  barcode: string;
  name: string;
  imageUrl: string;
  quantity: number;
  updatedAt: string;
  location: string;
  status: string;
  supplier: string;
  supplierCompany: string;
  category: string;
}

const StockPage: React.FC = () => {
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [user, setUser] = useState<{
    userId: string;
    username: string;
    role: string;
    email: string;
  } | null>(null);
  const [Warehouses, setGetWarehouses] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const navigate = useNavigate(); // ใช้สำหรับเปลี่ยนหน้า
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          userId: decoded.userId,
          role: decoded.role, // ✅ ตรงนี้แก้ให้ถูกต้อง
          username: decoded.username,
          email: decoded.email,
        });
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("❌ No token found");
        setLoading(false);
        return;
      }

      try {
        const stock = await getStockData(token);
        setStockData(stock);
        console.log("stock data:", stock);
        const productData = await getProducts();

        if (productData.success && Array.isArray(productData.data)) {
          setProducts(productData.data);
          // console.log(productData.data);
        } else {
          setError("ไม่พบข้อมูลสินค้า");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchWarehouses = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("❌ No token found for warehouse");
        return;
      }

      try {
        const warehouseList = await getWarehouses();
        // console.log("📦 Warehouse Data:", warehouseList);
        setGetWarehouses(warehouseList); // สมมุติว่าข้อมูลเป็น array
      } catch (error) {
        setError("❌ ไม่สามารถโหลดข้อมูลคลังสินค้าได้");
        console.error("Warehouse Fetch Error:", error);
      }
    };

    fetchWarehouses();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("❌ No token found for categories");
        return;
      }

      try {
        const categoryList = await getCategories(token);
        console.log("📦 Category Data (API response):", categoryList);
        setCategories(categoryList.data); // สำคัญมาก
      } catch (error) {
        setError("❌ ไม่สามารถโหลดข้อมูลหมวดหมู่ได้");
        console.error("Category Fetch Error:", error);
      }
    };

    fetchCategories();
  }, []);

  const getProductDetails = (barcode: string) => {
    return products.find((product) => product.barcode === barcode);
  };
  const getLocationName = (locationId: string) => {
    const location = Warehouses.find((w) => w._id === locationId);
    return location ? location.location : "ไม่ทราบที่เก็บ";
  };

  const getCategoryNameById = (categoryId: string | undefined) => {
    if (!categoryId || !Array.isArray(categories)) return "ไม่ทราบหมวดหมู่";

    const category = categories.find((cat) => cat._id === categoryId);
    return category ? category.name : "ไม่ทราบหมวดหมู่";
  };

  const formatThaiDateTime = (dateString: string) =>
    new Date(dateString)
      .toLocaleString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      })
      .replace("น.", "")
      .trim() + " น.";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "สินค้าพร้อมขาย":
        return "✅";
      case "สินค้าหมด":
        return "❌";
      default:
        return "⚠️";
    }
  };

  const filteredStock = stockData.filter((item) => {
    const product = getProductDetails(item.barcode);
    const searchText = searchQuery.toLowerCase();

    return (
      product?.name?.toLowerCase().includes(searchText) ||
      product?.category?.toLowerCase().includes(searchText) ||
      item.supplier?.toLowerCase().includes(searchText) ||
      item.barcode.includes(searchText)
    );
  });

  // ฟังก์ชันเมื่อคลิกที่แถว
  const handleRowClick = (barcode: string) => {
    navigate(`/products/barcode/${barcode}`); // ไปยังหน้ารายละเอียดสินค้า
  };

  return (
    <div className="stock-container">
      <h2 className="stock-header">📦 จัดการสต็อกสินค้า</h2>

      {loading && <p className="loadingStock">⏳ Loading...</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 ค้นหาสินค้า..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {user?.role !== "employee" && (
        <Link to="/add-product">
          <button className="add-product-button">
            <FontAwesomeIcon icon={faPlus} /> เพิ่มสินค้า
          </button>
        </Link>
      )}
      {!loading && !error && (
        <table className="stock-table">
          <thead>
            <tr className="stock-header-row">
              <th className="stock-header-cell">ลำดับ</th>
              <th className="stock-header-cell">สินค้า</th>
              <th className="stock-header-cell">รูปภาพ</th>
              <th className="stock-header-cell">ราคา</th>
              <th className="stock-header-cell">จำนวน</th>
              <th className="stock-header-cell">คลังสินค้า</th>
              <th className="stock-header-cell">ซัพพลายเออร์</th>
              <th className="stock-header-cell">สถานะ</th>
              <th className="stock-header-cell">หมวดหมู่</th>
              <th className="stock-header-cell">อัพเดทล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length > 0 ? (
              filteredStock.map((item, index) => {
                const product = getProductDetails(item.barcode);
                return (
                  <tr
                    key={item.barcode}
                    className="clickable-row"
                    onClick={() => handleRowClick(item.barcode)} // กดแล้วไปหน้ารายละเอียด
                  >
                    <td className="stock-cell">{index + 1}</td>
                    <td className="stock-cell">
                      {product ? product.name : "ไม่พบสินค้า"}
                    </td>
                    <td className="stock-cell">
                      {product && product.imageUrl ? (
                        <img src={product.imageUrl} className="product-image" />
                      ) : (
                        "ไม่มีรูป"
                      )}
                    </td>
                    <td className="stock-cell">{product?.price} บาท</td>
                    <td className="stock-cell">{item.quantity}</td>
                    <td className="stock-cell">
                      {getLocationName(item.location)}
                    </td>
                    <td className="stock-cell">{item.supplier}</td>
                    <td className="stock-cell status-cell">
                      {getStatusIcon(item.status)} {item.status}
                    </td>
                    <td className="stock-cell">
                      {getCategoryNameById(product.category)}
                    </td>
                    <td className="stock-cell">
                      {formatThaiDateTime(item.updatedAt)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="no-data">
                  🔍 ไม่พบข้อมูลสินค้าในร้านของคุณ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StockPage;
