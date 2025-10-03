import { Router } from 'express';
import { addProductWithStock, updateProductWithStock } from '../controllers/uploadController'; // นำเข้าคอนโทรลเลอร์
import upload from '../middlewares/uploadMiddleware'; // นำเข้า middleware สำหรับอัปโหลดไฟล์
const router = Router();

// Route สำหรับการอัปโหลดภาพของสินค้า
router.post('/upload', upload.single('image'), addProductWithStock);

// Route สำหรับการอัปเดตข้อมูลสินค้าและสต็อก
router.patch('/update', upload.single('image'), updateProductWithStock);

export default router;
