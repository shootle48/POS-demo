import express from "express";
import {
    createQCRecord,
    getQCByBatch,
    updateQCStatus, // ✅ ยังใช้สำหรับอัปเดต QC ของทั้ง PO ได้
    deleteQCRecord,
} from "../controllers/qcController";
import upload from "../middlewares/uploadMiddleware";

const router = express.Router();

/* =========================================================
   ✅ CREATE QC RECORD (รองรับแนบหลายรูป)
   → ใช้ตอนสร้างใบ QC ครั้งแรก (สินค้าเพิ่งเข้าคลัง)
========================================================= */
router.post("/create", upload.array("attachments", 10), createQCRecord);

/* =========================================================
   ✅ GET QC BY BATCH NUMBER
   → ดึงข้อมูล QC ทั้งหมดของล็อตนั้น
========================================================= */
router.get("/:batchNumber", getQCByBatch);

/* =========================================================
   ✅ UPDATE QC STATUS (ของทั้งใบ PO)
   → ใช้ตอนสรุปผล QC ทั้งใบ (optional)
========================================================= */
router.patch("/update/:id", updateQCStatus);

/* =========================================================
   ✅ DELETE QC RECORD
   → ลบเอกสาร QC ออกจากระบบ (ไม่ revert lot)
========================================================= */
router.delete("/:id", deleteQCRecord);

export default router;
