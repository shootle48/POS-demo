import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { connectDB } from "./database";
import bodyParser from "body-parser";
import Stock from "./routes/stockRoutes";
import orderRoutes from './routes/orderRoutes';
import testRoute from './routes/testRoutes';
import Supplier from "./routes/supplierRoutes";
import StockTransaction from "./routes/stockTransactionRoutes";
import employeeRouter from './routes/employeeRoutes'; // เชื่อมต่อ router ของพนักงาน
import createPayment from './routes/paymentRouter';
import receiptRoutes from "./routes/receiptRoutes";
import warehouseRoutes from "./routes/warehouseRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import purchaseOrderRouter from "./routes/purchaseOrderRoutes";
import cors from "cors";


dotenv.config();
const app = express();
const PORT: number = Number(process.env.PORT) || 5000;

// เชื่อมต่อ MongoDB
connectDB();

// สร้าง API สำหรับทดสอบ
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Dashboard</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #121212;
          color: #f0f0f0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          text-align: center;
          max-width: 800px;
          padding: 40px;
          border-radius: 10px;
          background: #1e1e1e;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #00d1ff;
        }
        p {
          font-size: 1.2rem;
          margin-bottom: 20px;
          color: #aaa;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          margin: 10px 0;
          font-size: 1rem;
        }
        a {
          color: #00d1ff;
          text-decoration: none;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>API is running...</h1>
        <p>Welcome to the API Dashboard (dark theme)</p>
        <h3>Available Endpoints:</h3>
        <ul>
          <li><a href="/api/products">GET /api/products</a></li>
          <li>GET /api/products/:id</li>
          <li>POST /api/product/upload</li>
          <li>GET /api/stocks</li>
          <li>GET /api/orders</li>
          <li>GET /api/suppliers</li>
          <li>GET /api/employee</li>
          <li>GET /api/payment</li>
          <li>GET /api/receipts</li>
          <li>GET /api/warehouses</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.153:3000', 'https://ae80-184-82-100-22.ngrok-free.app'], // อนุญาตหลาย origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // อนุญาตเฉพาะ method ที่ระบุ
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
// Middleware
app.use(express.json());  // ใช้ express.json() เท่านั้น
app.use(bodyParser.json()); // ลบได้

// หรือระบุเฉพาะ Frontend ของคุณ
app.use('/api/test', testRoute);
app.use("/api/products", productRoutes);
app.use("/api/products/barcode", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", uploadRoutes);
app.use("/api/auth", authRoutes);  // ใช้เพียงเส้นทางนี้
app.use('/api/', orderRoutes);
app.use('/api/suppliers', Supplier)
app.use('/api/employee', employeeRouter);
app.use('/api/payment', createPayment);
app.use("/api/receipts", receiptRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/stocks", Stock);
app.use("/api/stock", StockTransaction);
app.use("/api/",purchaseOrderRouter);


// เริ่มเซิร์ฟเวอร์
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


