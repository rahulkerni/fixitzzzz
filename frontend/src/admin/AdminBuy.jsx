import React from "react";
import CrudManager from "@/admin/CrudManager";

export default function AdminBuy() {
  return (
    <div>
      <p className="text-sm text-n500 mb-4">Manage refurbished phone inventory — condition, price and stock.</p>
      <CrudManager
        collection="buy_phones"
        title="Refurbished Phone"
        defaults={{ active: true, condition: "good", stock: 1, warranty: "6 months FixitZ warranty" }}
        columns={[
          { key: "image", label: "" }, { key: "name", label: "Name" },
          { key: "condition", label: "Condition" }, { key: "price", label: "Price" }, { key: "stock", label: "Stock" },
        ]}
        fields={[
          { key: "name", label: "Phone Name", type: "text" },
          { key: "brand", label: "Brand", type: "text" },
          { key: "price", label: "Price (₹)", type: "number" },
          { key: "condition", label: "Condition", type: "select", options: [{ value: "excellent", label: "Excellent" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }] },
          { key: "stock", label: "Stock", type: "number" },
          { key: "image", label: "Image URL", type: "text" },
          { key: "warranty", label: "Warranty", type: "text" },
          { key: "active", label: "Active", type: "boolean" },
        ]}
      />
    </div>
  );
}
