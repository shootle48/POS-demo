import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

// 🧩 Components
import SearchFilter from "./SearchFilter";
import ProductGrid from "./ProductGrid";
import CartSidebar from "./CartSidebar";
import NumberPad from "./NumberPad";
import StockErrorDialog from "./StockErrorDialog";
import Checkout from "../payment/Checkout";
import { Product, StockItem, Category } from "../../types/productTypes";
import ReceiptModal from "../receipt/ReceiptModal"; 

// 🧠 APIs
import { getProducts } from "../../api/product/productApi";
import { getStockData, createOrder } from "../../api/stock/stock";
import { createPayment } from "../../api/payment/paymentApi";
import { getCategories } from "../../api/product/categoryApi";

// 🎨 Styles
import "../../styles/product/ProductList.css";

interface CartProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const ProductList: React.FC<CartProps> = ({ isSidebarOpen }) => {
  // ======================= States =======================
  const [user, setUser] = useState<{ userId: string; username: string; role: string; email: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [popupVisible, setPopupVisible] = useState(false);
  const [errorType, setErrorType] = useState<"outOfStock" | "notFound">("outOfStock");

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Search + Filter
  const [searchProduct, setSearchProduct] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // NumberPad
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [selectedProductBarcode, setSelectedProductBarcode] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("1");
  const [numpadErrorMessage, setNumpadErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStockError, setShowStockError] = useState(false);

  // ======================= Effects =======================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          email: decoded.email,
        });
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const wrapper = document.querySelector(".search-wrapper");
      if (window.scrollY > 20) wrapper?.classList.add("scrolled");
      else wrapper?.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // 🧱 STEP 1: โหลด Stock ก่อน (เก็บทั้ง stock._id + product._id + ราคา)
        const stock = await getStockData(token);

        const mappedStock: StockItem[] = (stock || []).map((item: any) => ({
          _id: item._id,                  // ✅ เก็บ id ของ Stock
          barcode: item.barcode,
          isActive: item.isActive === true, // ป้องกัน undefined
          totalQuantity: Number(item.totalQuantity ?? 0),
          status: item.status || "",
          supplier: item.supplier || item.supplierId?.companyName || "",
          costPrice: Number(item.costPrice ?? item.productId?.costPrice ?? 0),
          salePrice: Number(item.salePrice ?? item.productId?.price ?? 0),
          productId: {
            _id: item.productId?._id,
            isActive: item.productId?.isActive ?? item.isActive ?? true,
            name: item.productId?.name || "",
            price: Number(item.salePrice ?? item.productId?.price ?? 0),
            barcode: item.productId?.barcode || item.barcode || "",
            imageUrl: item.productId?.imageUrl || "",
            category: {
              _id: item.productId?.category?._id,
              name: item.productId?.category?.name || "",
            },
          },
        }));

        setStockData(mappedStock);

        // 🧱 STEP 2: โหลด Products แล้ว match กับ stock (เพื่อให้ product มีราคา/สต็อกจริง)
        const res = await getProducts();
        if (res?.success && Array.isArray(res.data)) {
          const mappedProducts: Product[] = res.data.map((item: any) => {
            const p = item.productId || {};
            const stockItem = mappedStock.find((s) => s.productId?._id === p._id);

            return {
              _id: p._id,                         // ✅ product._id จริง (สำคัญมากสำหรับ FEFO)
              stockId: stockItem?._id,            // ✅ อ้างอิง stock._id (optional)
              barcode: p.barcode || "",
              name: p.name || "",
              isActive: item.isActive ?? true,
              price: stockItem?.salePrice ?? Number(p.price ?? 0), // ใช้ salePrice ก่อน
              costPrice: stockItem?.costPrice ?? 0,
              totalQuantity: stockItem?.totalQuantity ?? 0,
              category: {
                _id: p.category?._id || "",
                name: p.category?.name || "",
              },
              imageUrl: p.imageUrl || "",
              // ถ้า type Product ของคุณไม่มีฟิลด์พวกนี้ ก็เพิ่มใน types หรือปล่อยไว้ (TS optional)
            } as Product;
          });

          setProducts(mappedProducts);
        } else {
          setErrorMessage("ไม่พบข้อมูลสินค้า");
        }

        // 🧱 STEP 3: โหลด Category
        const categoryRes = await getCategories(token);
        if (categoryRes?.success && Array.isArray(categoryRes.data)) {
          setCategories(categoryRes.data);
        }
      } catch (err) {
        console.error("❌ โหลดข้อมูลล้มเหลว:", err);
        setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // ======================= Handlers =======================
  const addToCart = (product: Product) => {
    const productStock = stockData.find((item) => item.barcode === product.barcode);
    const currentCartItem = cart.find((item) => item.barcode === product.barcode);
    const currentQtyInCart = currentCartItem ? currentCartItem.totalQuantity : 0;

    if (productStock && currentQtyInCart + 1 > (productStock.totalQuantity ?? 0)) {
      setShowStockError(true);
      setErrorType("outOfStock");
      return;
    }

    setCart((prevCart) => {
      const existingProduct = prevCart.find((item) => item.barcode === product.barcode);
      if (existingProduct) {
        return prevCart.map((item) =>
          item.barcode === product.barcode
            ? { ...item, totalQuantity: item.totalQuantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, totalQuantity: 1 }];
    });
  };

  const removeFromCart = (_item: Product, barcode: string) =>
    setCart((prev) => prev.filter((i) => i.barcode !== barcode));

  const clearCart = () => setCart([]);

  const handleProductNotFound = () => {
    setErrorType("notFound");
    setShowStockError(true);
  };

  const openNumberPad = (initialQty: number, barcode: string) => {
    setSelectedProductBarcode(barcode);
    setCurrentQuantity(initialQty.toString());
    setErrorMessage("");
    setIsEditing(false);
    setShowNumberPad(true);
    setNumpadErrorMessage("");
  };

  const handleQuantityChange = (value: string) => {
    setErrorMessage("");
    setCurrentQuantity((prev) => {
      if (!isEditing || prev === "0") {
        setIsEditing(true);
        return value;
      } else {
        return prev + value;
      }
    });
  };

  const handleDeleteOne = () => setCurrentQuantity((prev) => prev.slice(0, -1) || "0");
  const handleClear = () => setCurrentQuantity("0");

  const handleSetQuantity = () => {
    const value = parseInt(currentQuantity, 10);
    if (isNaN(value) || value <= 0) return;

    const stock = stockData.find((s) => s.barcode === selectedProductBarcode);
    if (stock && value > (stock.totalQuantity ?? 0)) {
      setNumpadErrorMessage("❌ สินค้าในคลังไม่พอ");
      return;
    }

    setCart((prev) =>
      prev.map((i) =>
        i.barcode === selectedProductBarcode ? { ...i, totalQuantity: value } : i
      )
    );
    setShowNumberPad(false);
  };

  const getTotalPrice = () =>
    cart.reduce((sum, i) => sum + Number(i.price ?? 0) * Number(i.totalQuantity ?? 0), 0);

  const checkout = async (
    amountReceived: number,
    method: "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code",
    discountAmount: number = 0
  ) => {
    if (!user) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนทำรายการ");
      return;
    }

    const finalTotal = Math.max(getTotalPrice() - discountAmount, 0);

    const orderData = {
      saleId: new Date().getTime().toString(),
      userId: user.userId,
      source: "POS",
      items: cart.map((i) => ({
        productId: i._id,             // ✅ สำคัญ: product._id จริง (ใช้ตัดล็อต FEFO)
        stockId: i.stockId || null,   // optional เผื่อ debug/ตรวจสอบ
        barcode: i.barcode,
        name: i.name,
        price: i.price,
        costPrice: i.costPrice ?? undefined, // optional (ช่วยให้บันทึกธุรกรรมได้ครบ)
        quantity: i.totalQuantity,
        subtotal: Number(i.price ?? 0) * Number(i.totalQuantity ?? 0),
      })),
      paymentMethod: method,
      amount: finalTotal,
      amountReceived,
      change: amountReceived - finalTotal,
      discount: discountAmount,
    };

    try {
      const orderRes = await createOrder(orderData);
      if (!orderRes.success) throw new Error(orderRes.message);

      const paymentRes = await createPayment({
        saleId: orderData.saleId,
        employeeName: user.username,
        paymentMethod: method,
        amount: finalTotal,
        amountReceived,
        change: amountReceived - finalTotal,
        discount: discountAmount,
        items: orderData.items,
      });

      if (!paymentRes.success) throw new Error(paymentRes.message);

      // ✅ เก็บข้อมูลใบเสร็จไว้แสดงหลังจาก popup ปิด
      setReceiptData({
        paymentId: {
          saleId: orderData.saleId,
          paymentMethod: method,
          createdAt: new Date().toISOString(),
        },
        employeeName: user.username,
        totalPrice: finalTotal,
        discount: discountAmount,
        amountPaid: amountReceived,
        changeAmount: amountReceived - finalTotal,
        timestamp: new Date().toISOString(),
        items: orderData.items,
      });


      setPopupVisible(true);
      setCart([]);
      setTimeout(() => setShowCheckout(false), 200);
    } catch (err) {
      setErrorMessage("💥 เกิดข้อผิดพลาดในการชำระเงิน");
      console.error(err);
    }
  };

  // ======================= Filter =======================
  const filteredProducts = products.filter((p) => {
    const matchName = (p.name || "").toLowerCase().includes(searchProduct.toLowerCase());
    const matchCategory = !categoryFilter || p.category._id === categoryFilter;
    return matchName && matchCategory;
  });

  // ======================= Render =======================
  return (
    <div className="display">
      <div className="pos-page">
        <div className="pos-search-bar">
          <div className="search-wrapper">
            <SearchFilter
              searchProduct={searchProduct}
              setSearchProduct={setSearchProduct}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              isSidebarOpen={isSidebarOpen}
              products={products}
              addToCart={addToCart}
              onProductNotFound={handleProductNotFound}
            />
          </div>

          <div className="pos-main-content">
            <div className="pos-product-area">
              <ProductGrid
                products={products}
                filteredProducts={filteredProducts}
                cart={cart}
                addToCart={addToCart}
                errorMessage={errorMessage}
                loading={loading}
                searchProduct={searchProduct}
                categoryFilter={categoryFilter}
              />
            </div>

            <div className="pos-cart-area">
              {/* 🏪 หัวของตะกร้า */}
              <div className="cart-header">
                <h1 className="cart-store-title">EAZY POS</h1>
                <p className="cart-store-subtitle">ระบบขายหน้าร้านอัจฉริยะ</p>
              </div>

              {/* 🛒 เนื้อหาตะกร้า */}
              {cart.length > 0 ? (
                <CartSidebar
                  cart={cart}
                  isSidebarOpen={isSidebarOpen}
                  clearCart={clearCart}
                  removeFromCart={removeFromCart}
                  openNumberPad={openNumberPad}
                  getTotalPrice={getTotalPrice}
                  setShowCheckout={setShowCheckout}
                />
              ) : (
                <div className="cart-empty">
                  <img src="/images/empty-cart.svg" alt="ไม่มีสินค้าในตะกร้า" />
                  <p>ยังไม่มีสินค้าในตะกร้า</p>
                  <small>เลือกสินค้าทางด้านซ้ายเพื่อเริ่มขายได้เลย 💳</small>
                </div>
              )}

              <StockErrorDialog
                show={showStockError}
                onClose={() => setShowStockError(false)}
                messageType={errorType}
              />

              {showCheckout && (
                <Checkout
                  cart={cart}
                  totalPrice={getTotalPrice()}
                  onClose={() => setShowCheckout(false)}
                  checkout={checkout}
                  onConfirmPayment={() => {}}
                />
              )}

              {showNumberPad && (
                <NumberPad
                  currentQuantity={currentQuantity}
                  handleQuantityChange={handleQuantityChange}
                  handleDeleteOne={handleDeleteOne}
                  handleClear={handleClear}
                  handleSetQuantity={handleSetQuantity}
                  setShowNumberPad={setShowNumberPad}
                  numpadErrorMessage={numpadErrorMessage}
                />
              )}

              {popupVisible && (
                <div
                  className="payment-popup-overlay"
                  onClick={() => {
                    setPopupVisible(false);
                    setShowReceipt(true); // ✅ เปิดใบเสร็จทันที
                  }}
                >
                  <div className="payment-popup" onClick={(e) => e.stopPropagation()}>
                    <h2>✅ ชำระเงินสำเร็จ!</h2>
                    <p>ขอบคุณที่ใช้บริการ 🎉</p>
                    <button
                      className="payment-popup-close"
                      onClick={() => {
                        setPopupVisible(false);
                        setShowReceipt(true);
                      }}
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}
              {showReceipt && receiptData && (
                <ReceiptModal
                  receipt={receiptData}
                  onClose={() => setShowReceipt(false)}
                />
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
