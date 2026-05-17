import React from "react";

const Inventory = () => {
  return (
    <div className="flex flex-col  items-center justify-center w-full">
      <div className="flex flex-col w-2/3 items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          <i className="bi bi-lock-fill"></i> Inventory Master
        </div>
        <form
          autoComplete="off"
          className="flex flex-col gap-2 w-full border border-sky-900 rounded-b-sm text-sm p-4 shadow-lg bg-neutral-900 "
        >
          <label>Inventory</label>
          <input name="inventory_name"></input>

          <label>Inventory Category</label>
          <select name="inventory_category">
            <option value="">Select Category</option>
            <option value="raw_material">Fridge Bottles</option>
            <option value="finished_goods">PET Jars</option>
            <option value="consumables">Preforms</option>
          </select>

          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <label>Neck Size (mm)</label>
            <label>Weight (g)</label>
            <label>Quantity per Pack</label>

            <input type="number" name="neck_size"></input>
            <input type="number" name="weight"></input>
            <input type="number" name="quantity_per_pack"></input>
          </div>

          <label>Inventory Image</label>
          <input type="file" name="inventory_image"></input>

          <label>Remarks</label>
          <textarea
            name="remarks"
            rows="2"
            style={{ resize: "none" }}
          ></textarea>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
