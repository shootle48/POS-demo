import {
    getStockLots,
    getStockLotsByBarcode,
} from "../../../api/stock/stockLotApi";
import { getStockData } from "../../../api/stock/stock";
import { getPurchaseOrders } from "../../../api/purchaseOrder/purchaseOrderApi";
import { getSupplierData } from "../../../api/suppliers/supplierApi";
import { getWarehouseData } from "../../../api/warehouse/warehouseApi";
import { getCategories } from "../../../api/product/categoryApi";

export const loadStockLotData = async (token: string) => {
    const [lots, stocks, pos, suppliers, warehouses, categories] =
        await Promise.all([
            getStockLots(token),
            getStockData(token),
            getPurchaseOrders(token),
            getSupplierData(token),
            getWarehouseData(token),
            getCategories(token),
        ]);

    return {
        lots: lots?.data || lots || [],
        stocks: stocks?.data || stocks || [],
        pos: pos?.data || pos || [],
        suppliers: suppliers?.data || suppliers || [],
        warehouses: warehouses?.data || warehouses || [],
        categories: categories?.data || categories || [],
    };
};

