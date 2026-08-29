import React from "react";
import CrudManager from "@/admin/CrudManager";

const SECTION_TYPES = [
  "banner", "repair_service", "shop_products", "flash_sale",
  "sell_phone", "buy_phone", "referral", "video", "custom",
].map((v) => ({ value: v, label: v }));

export default function AdminSections() {
  return (
    <div>
      <p className="text-sm text-n500 mb-4">Control the entire homepage. Reorder, hide, or add sections — changes appear live in the app.</p>
      <CrudManager
        collection="sections"
        title="Homepage Section"
        defaults={{ visible: true, order: 0, config: "{}" }}
        columns={[
          { key: "order", label: "Order" },
          { key: "type", label: "Type" },
          { key: "title", label: "Title" },
          { key: "visible", label: "Visible" },
        ]}
        fields={[
          { key: "type", label: "Section Type", type: "select", options: SECTION_TYPES },
          { key: "title", label: "Title", type: "text" },
          { key: "order", label: "Display Order", type: "number", help: "Lower shows first" },
          { key: "visible", label: "Visibility", type: "boolean" },
          { key: "config", label: "Config (JSON)", type: "json", help: 'e.g. {"tag":"featured"} or banner slides array' },
        ]}
      />
    </div>
  );
}
