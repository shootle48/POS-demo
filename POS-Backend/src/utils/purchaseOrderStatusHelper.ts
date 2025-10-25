import PurchaseOrder from "../models/PurchaseOrder";
import StockLot from "../models/StockLot";

/* ========================================================
   ⚙️ updatePurchaseOrderStatus
   → ฟังก์ชันอัปเดตสถานะของใบ PO อัตโนมัติ
   ใช้หลังจาก QC เสร็จ หรือคืนสินค้าแล้ว
======================================================== */
export const updatePurchaseOrderStatus = async (poId: string): Promise<void> => {
    try {
        const po = await PurchaseOrder.findById(poId).populate("stockLots");
        if (!po) return;

        const lots = po.stockLots as any[];

        // ✅ แยกล็อตที่ผ่าน / ไม่ผ่าน / ผ่านบางส่วน
        const failLots = lots.filter(
            (l) => l.qcStatus === "ไม่ผ่าน" || l.qcStatus === "ผ่านบางส่วน"
        );
        const passedLots = lots.filter((l) => l.qcStatus === "ผ่าน");

        const allFailReturned =
            failLots.length > 0 && failLots.every((l) => l.returnStatus?.includes("คืน"));

        /* ========================================================
           🧩 Logic การอัปเดตสถานะ PO ตามสถานะล็อตทั้งหมด
        ========================================================= */
        if (failLots.length > 0 && passedLots.length > 0) {
            // มีทั้งผ่านและไม่ผ่าน
            if (allFailReturned) {
                po.status = "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว";
            } else {
                po.status = "ไม่ผ่าน QC - รอส่งคืนสินค้า";
            }
            po.qcStatus = "ผ่านบางส่วน";
        } else if (failLots.length > 0 && passedLots.length === 0) {
            // ไม่ผ่านทั้งหมด
            if (allFailReturned) {
                po.status = "ไม่ผ่าน QC - คืนสินค้าแล้ว";
            } else {
                po.status = "ไม่ผ่าน QC - รอส่งคืนสินค้า";
            }
            po.qcStatus = "ไม่ผ่าน";
        } else if (passedLots.length > 0 && failLots.length === 0) {
            // ผ่านทั้งหมด
            po.status = "QC ผ่าน";
            po.qcStatus = "ผ่าน";
        } else {
            // ยังไม่ตรวจ QC
            po.status = "ได้รับสินค้าแล้ว";
            po.qcStatus = "รอตรวจสอบ";
        }

        po.updatedAt = new Date();
        await po.save();

        console.log(`✅ อัปเดตสถานะ PO ${po.purchaseOrderNumber} → ${po.status}`);
    } catch (error) {
        console.error("❌ Error updating PO status:", (error as Error).message);
    }
};
