import { useState, useEffect } from "react";
import { getProducts } from "../../api/product/productApi";
import { createOrder, getStockData } from "../../api/stock/stock";
import { createPayment } from "../../api/payment/paymentApi"; // นำเข้า API ชำระเงิน
import { getCategories, getProductsByCategory } from "../../api/product/categoryApi"; // Import API ดึงหมวดหมู่สินค้า
import Checkout from "../payment/Checkout"; // นำเข้า Checkout Modal
import "../../styles/product/ProductList.css";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";

import React from "react";

interface StockItem {
  barcode: string;
  quantity: number;
  status: string;
  supplier: string;
  productId: {
    _id: string;
    name: string;
    price: number;
    barcode: string;
    imageUrl: string;
    category: {
      _id: string;
      name: string;
    };
  };
  location?: {
    _id: string;
    name: string;
    location: string;
  };
}

interface Category {
  _id: string;
  name: string;
}

interface CartProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}
interface Product {
  _id: string;
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  category: {
    _id: string;
    name: string;
  }

  imageUrl: string;
}

const ProductList: React.FC<CartProps> = ({ isSidebarOpen }) => {
  const [user, setUser] = useState<{ userId: string; username: string; role: string; email: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [showStockError, setShowStockError] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  const [showCart, setShowCart] = useState<boolean>(false);
  const [showNumberPad, setShowNumberPad] = useState<boolean>(false);
  const [selectedProductBarcode, setSelectedProductBarcode] = useState<string>("");
  const [currentQuantity, setCurrentQuantity] = useState("1");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false); // ✅ ใช้เพื่อตรวจว่าเพิ่งเริ่มพิมพ์หรือยัง
  const [numpadErrorMessage, setNumpadErrorMessage] = useState("");

  const [lowStockMessages, setLowStockMessages] = useState<Map<string, string>>(new Map());
  const [searchProduct, setSearchProduct] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [loading, setLoading] = useState(true); // ✅ state สำหรับสถานะโหลด

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          userId: decoded.userId,
          role: decoded.userId,
          username: decoded.username,
          email: decoded.email,
        });
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('noscroll');
    return () => {
      document.body.classList.remove('noscroll');
    };
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("❌ ไม่พบ token");
        setLoading(false);
        return;
      }

      try {
        const stock = await getStockData(token);

        // ✅ แปลงข้อมูลจาก API ให้เป็นรูปแบบที่ UI ใช้ได้
        const mappedStock: StockItem[] = stock.map((item: any) => ({
          barcode: item.barcode,
          quantity: item.quantity,
          status: item.status,
          supplier: item.supplier,
          productId: {
            _id: item.productId?._id,
            name: item.productId?.name || "",
            price: item.productId?.price || 0,
            barcode: item.productId?.barcode || "",
            imageUrl: item.productId?.imageUrl || "",
            category: {
              _id: item.productId?.category?._id,
              name: item.productId?.category?.name || ""
            }
          },
          location: item.location
            ? {
              _id: item.location._id,
              name: item.location.name,
              location: item.location.location
            }
            : undefined
        }));

        setStockData(mappedStock);
        setLoading(false); // ⬅️ ต้องปิด loading หลังจากโหลดเสร็จ
      } catch (err) {
        setErrorMessage("❌ ดึงข้อมูล stock ไม่สำเร็จ");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productData = await getProducts();
        console.log("Product data: ", productData);

        if (productData.success && Array.isArray(productData.data)) {
          const allProducts: Product[] = productData.data.map((item: any) => ({
            _id: item.productId?._id,
            barcode: item.productId?.barcode || "",
            name: item.productId?.name || "",
            price: item.productId?.price || 0,
            quantity: item.quantity || 0,
            category: {
              _id: item.productId?.category?._id || "",
              name: item.productId?.category?.name || "",
            },
            imageUrl: item.productId?.imageUrl || "",
          }));
          setProducts(allProducts);
        } else {
          setErrorMessage("ไม่พบข้อมูลสินค้า");
        }
      } catch (error) {
        setErrorMessage("เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า");
        console.error(error);
      } finally {
        setLoading(false); // ⬅️ ปิด loading เสมอหลังจากโหลดเสร็จ
      }
    };

    fetchProducts();
  }, []);


  // เรียกเมื่อต้องการเปิด numpad
  const openNumberPad = (initialQty: number) => {
    setCurrentQuantity(initialQty.toString());
    setErrorMessage("");
    setIsEditing(false); // ✅ เตรียมให้เปลี่ยนเลขใหม่ทันทีที่กด
    setShowNumberPad(true);
    setNumpadErrorMessage("");
  };


  const handleQuantityChange = (value: string) => {
    setErrorMessage("");
    setCurrentQuantity((prev) => {
      if (!isEditing || prev === "0") {
        setIsEditing(true);
        return value; // ✅ ถ้ายังไม่เคยแก้ หรือเป็น 0 → แทนค่าใหม่
      } else {
        return prev + value; // ต่อท้ายตามปกติ
      }
    });
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      try {
        const categoryList = await getCategories(token);
        if (categoryList.success && Array.isArray(categoryList.data)) {
          setCategories(categoryList.data);
        } else {

        }

        console.log("📦 Category Data:", categoryList);
      } catch (error) {

        console.error("Category Fetch Error:", error);
      }
    };

    fetchCategories();
  }, []);

  // ลบทีละตัว
  const handleDeleteOne = () => {
    setErrorMessage("");
    setIsEditing(true);
    setCurrentQuantity((prev) => {
      const updated = prev.slice(0, -1);
      return updated || "0";
    });
  };

  // ล้างทั้งหมด
  const handleClear = () => {
    setCurrentQuantity("0");
    setErrorMessage("");
    setNumpadErrorMessage("");
    setIsEditing(false);
  };

  const handleSetQuantity = () => {
    const value = parseInt(currentQuantity, 10);
    if (isNaN(value) || value <= 0) {
      setErrorMessage("กรุณาใส่จำนวนที่ถูกต้อง");
      return;
    }

    // หา stock ของสินค้าชิ้นนี้
    const productStock = stockData.find(item => item.barcode === selectedProductBarcode);

    if (productStock && value > productStock.quantity) {
      setNumpadErrorMessage("❌ สินค้าในคลังไม่เพียงพอ");
      return;
    }

    // ✅ อัปเดตจำนวนในตะกร้า
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.barcode === selectedProductBarcode
          ? { ...item, quantity: value }
          : item
      )
    );

    setShowNumberPad(false);
    setNumpadErrorMessage("");
  };



  const addToCart = (product: Product) => {
    const productStock = stockData.find(item => item.barcode === product.barcode);

    // หาจำนวนใน cart ปัจจุบันก่อน
    const currentCartItem = cart.find(item => item.barcode === product.barcode);
    const currentQtyInCart = currentCartItem ? currentCartItem.quantity : 0;

    if (productStock && currentQtyInCart + 1 > productStock.quantity) {
      setShowStockError(true);
      setNumpadErrorMessage("❌ สินค้าในคลังไม่เพียงพอ");
      return;
    }

    setCart((prevCart) => {
      const existingProduct = prevCart.find((item) => item.barcode === product.barcode);
      if (existingProduct) {
        return prevCart.map((item) =>
          item.barcode === product.barcode
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };




  const removeFromCart = (product: Product, barcode: string) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.filter(item => item.barcode !== barcode); // 🔥 ลบสินค้าทั้งหมดที่ตรงกับ barcode

      if (updatedCart.length === 0) {
        setShowCart(false); // ซ่อนตะกร้าเมื่อไม่มีสินค้า
      }

      // ลบข้อความแจ้งเตือน stock ต่ำเมื่อสินค้าถูกลบออกจากตะกร้า
      setLowStockMessages((prevMessages) => {
        const newMessages = new Map(prevMessages);
        newMessages.delete(barcode);
        return newMessages;
      });

      return updatedCart;
    });
  };


  const checkout = async (
    amountReceived: number,
    selectedPaymentMethod: "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code"
  ) => {
    if (!user) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนทำการชำระเงิน");
      return;
    }

    const orderData = {
      saleId: new Date().getTime().toString(),
      userId: user.userId,
      items: cart.map(item => ({
        productId: item._id,
        barcode: item.barcode,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      paymentMethod: selectedPaymentMethod,
      amount: getTotalPrice(),
      amountReceived,
      change: amountReceived - getTotalPrice(),
    };

    try {
      // 1) สร้าง Order
      const orderRes = await createOrder(orderData);
      if (!orderRes.success) {
        setErrorMessage(orderRes.message);
        return;
      }

      console.log("✅ Order created:", orderRes.data);

      // 2) สร้าง Payment
      const paymentData = {
        saleId: orderData.saleId, // ใช้ saleId เดียวกัน
        employeeName: user?.username || "ลูกค้า",
        paymentMethod: selectedPaymentMethod,
        amount: getTotalPrice(),
        amountReceived,
        change: amountReceived - getTotalPrice(),
        items: orderData.items,
      };

      const paymentRes = await createPayment(paymentData);
      if (!paymentRes.success) {
        setErrorMessage(paymentRes.message);
        return;
      }

      console.log("✅ Payment saved:", paymentRes.data);

      // clear cart
      setCart([]);
      setShowCart(false);
      setPopupVisible(true);

    } catch (err) {
      console.error("💥 Checkout error:", err);
      setErrorMessage("เกิดข้อผิดพลาดในการสร้างออเดอร์/การชำระเงิน");
    }
  };




  // 📌 ฟังก์ชันยืนยันการชำระเงินจาก Modal
  const handleConfirmPayment = (method: string, amountReceived?: number) => {
    const validPaymentMethods = ["เงินสด", "โอนเงิน", "บัตรเครดิต", "QR Code"] as const;

    if (!validPaymentMethods.includes(method as any)) {
      setErrorMessage("วิธีการชำระเงินไม่ถูกต้อง");
      return;
    }

    const paymentData = {
      saleId: new Date().getTime().toString(),
      employeeName: user?.username || "ลูกค้า",
      paymentMethod: method as "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code",
      amount: getTotalPrice(),
      amountReceived: amountReceived || getTotalPrice(), // ✅ ใช้ amountReceived หรือ totalPrice
      change: amountReceived ? amountReceived - getTotalPrice() : 0, // ✅ คำนวณเงินทอน
      items: cart.map(item => ({
        barcode: item.barcode,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }))
    };

    createPayment(paymentData)
      .then((response) => {
        if (!response.success) {
          setErrorMessage(response.message);
          return;
        }

        setCart([]);              // ล้างตะกร้า
        setPopupVisible(true);    // ✅ แสดง popup สำเร็จ
      })
      .catch((error) => {
        setErrorMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูลชำระเงิน");
        console.error(error);
      });

  };


  // คำนวณยอดรวมทั้งหมดในตะกร้า
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };



  const handleCloseCheckout = () => {
    setShowCheckout(false); // ✅ ปิด Modal ที่นี่
  };


  const clearCart = () => {
    setCart([]); // เคลียร์สินค้าในตะกร้า
  };


  const productsByCategory = categoryFilter
    ? products.filter(product => product.category?._id === categoryFilter)
    : products;

  const filteredProducts = productsByCategory.filter(product => {
    const name = (product?.name || "").toLowerCase();
    const keyword = (searchProduct || "").toLowerCase();
    return name.includes(keyword);
  });

  return (
    <div className="display-product">
      <div className="product-page">
        {/* ค้นหา + หมวดหมู่ filter */}
        <div className={`search-grid ${!isSidebarOpen ? "sidebar-closed-margin" : ""}`}>
          <div className="searchproduct-container">
            <input
              type="text"
              placeholder="🔍 ค้นหาสินค้า..."
              className="searchproduct-input"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
            />



            <div className="category-filter-container">
              <select
                className="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">📦 ทุกหมวดหมู่</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ส่วนแสดงสินค้า scroll ได้ */}
        <div className={`product-list-wrapper ${!isSidebarOpen ? "sidebar-closed-margin" : ""}`}>
          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <div className="product-grid">
            {loading ? (
              <p className="loading-message">⏳ กำลังโหลดสินค้า...</p>
            ) :
          filteredProducts.length === 0 ? (
              searchProduct.trim() !== "" || categoryFilter !== "" ? (
                <p className="no-product-message">❌ ไม่พบสินค้าที่คุณค้นหา</p>
              ) : (
                <p className="no-product-message">🔍 ไม่พบข้อมูลสินค้าในร้านของคุณ กรุณาเพิ่มสินค้าในหน้าจัดการสินค้า</p>
              )
            ) : (
              filteredProducts.map((product) => {
                const cartItem = cart.find((item) => item.barcode === product.barcode);

                return (
                  <div
                    key={product.barcode}
                    className="product-card"
                    onClick={() => addToCart(product)}
                  >
                    {cartItem && cartItem.quantity > 0 && (
                      <div className="product-quantity-badge">{cartItem.quantity}</div>
                    )}

                    <img src={product.imageUrl} alt={product.name} className="product-image" />
                    <h2 className="product-title">{product.name}</h2>
                    <p className="product-price">
                      {(product?.price ?? 0).toLocaleString()} ฿
                    </p>

                  </div>
                );
              })
            )}
          </div>


        </div>

        {/* ตะกร้าสินค้า */}
        <div
          className={`cart ${cart.length > 0 ? "show-cart" : "hidden-cart"} ${isSidebarOpen ? "cart-collapse" : "cart-expand"
            }`}
        >
          <p className="cart-summary">รวมทั้งหมด: {cart.reduce((sum, item) => sum + item.quantity, 0)} รายการ</p>

          <h2 className="cart-title ">ตะกร้าสินค้า</h2>
          <button onClick={clearCart} className="clear-cart-btn">เคลียตะกร้า</button>

          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.barcode} className="cart-item">
                <img src={item.imageUrl} alt={item.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="cart-item-quantity">จำนวน: {item.quantity}</p>
                  <p className="cart-item-price">
                    ราคา: {((item?.price ?? 0) * item.quantity).toLocaleString()} ฿
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProductBarcode(item.barcode);
                      setCurrentQuantity(item.quantity.toString());
                      setIsEditing(false); // ✅ รีเซ็ตสถานะการแก้ไข
                      openNumberPad(item.quantity); // ✅ ส่งจำนวนจริงไปแทน true
                    }}
                    className="edit-quantity-btn"
                  >
                    แก้ไขจำนวน
                  </button>

                </div>
                <button onClick={() => removeFromCart(item, item.barcode)} className="remove-btn">
                  ลบสินค้า
                </button>
              </div>
            ))}
          </div>

          {/* ✅ แสดงยอดรวมด้านบนปุ่มชำระเงิน ✅ */}
          <div className="cart-total">
            <div className="cart-total">
              <p>
                ยอดรวม: <span>{(getTotalPrice() ?? 0).toLocaleString()} ฿</span>
              </p>
            </div>
          </div>


          <div className="checkout">
            <button onClick={() => setShowCheckout(true)} className="checkout-btn">
              ชำระเงิน
            </button>
          </div>
        </div>


        {showStockError && (
          <div className="dialog-overlay" onClick={() => setShowStockError(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <h2 className="dialog-title">❌ สินค้าไม่เพียงพอ</h2>
              <p className="dialog-message">จำนวนสินค้าที่คุณเลือกมีมากกว่าที่มีในคลัง</p>
              <button className="dialog-button" onClick={() => setShowStockError(false)}>
                ปิด
              </button>
            </div>
          </div>
        )}


        {showCheckout && (
          <Checkout
            cart={cart}
            totalPrice={getTotalPrice()} // Pass the total price here
            onClose={handleCloseCheckout} // ✅ ปล่อยให้ Modal จัดการ
            onConfirmPayment={handleConfirmPayment}
            checkout={checkout} // ส่งฟังก์ชัน checkout ไปให้ Modal
          />
        )}

        {/* Number Pad for Quantity */}
        {showNumberPad && (
          <div className="numpad-overlay">
            <div className="numpad-product">
              <button onClick={() => setShowNumberPad(false)} className="numpad-product-close">
                &times;
              </button>

              <div className="numpad-product-display">
                {numpadErrorMessage ? (
                  <p className="numpad-product-error">{numpadErrorMessage}</p>
                ) : (
                  <p>จำนวน: {currentQuantity}</p>
                )}
              </div>

              <div className="numpad-product-buttons">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((button) => (
                  <button key={button} onClick={() => handleQuantityChange(button)} className="numpad-product-btn">
                    {button}
                  </button>
                ))}

                <button onClick={handleDeleteOne} className="numpad-product-clear-one">⬅</button>
                <button onClick={handleClear} className="numpad-product-clear">AC</button>
              </div>

              <button onClick={handleSetQuantity} className="numpad-product-set">
                เลือก
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductList;
