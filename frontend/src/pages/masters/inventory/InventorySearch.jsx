import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import Inventory from "./Inventory";

const InventorySearch = () => {
  const { api } = useContext(AuthContext);

  const [data, setData] = useState([]);
  const [inventoryName, setInventoryName] = useState("");
  const [modifyId, setModifyId] = useState(null);
  const [newInventory, setNewInventory] = useState(false);

  useEffect(() => {
    const fd = new FormData();
    fd.append("inventory_name", inventoryName || " ");
    fetch(`${api}/inventory/search`, {
      method: "POST",
      body: fd,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setData(data.data);
        }
      });
  }, [inventoryName]);

  if (modifyId) {
    return <Inventory action={"modify"} inventoryId={modifyId} />;
  }

  if (newInventory) {
    return <Inventory action={"new"} inventoryId={null} />;
  }

  return (
    <div className="flex flex-col  items-center justify-center w-full">
      <div className="flex flex-col w-4/5 items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Inventory Search
        </div>
        <div className="w-full border border-sky-900 rounded-b-sm text-sm shadow-lg bg-neutral-900">
          <div className="w-full p-2 flex flex-row gap-2">
            <input
              value={inventoryName}
              onChange={(e) => setInventoryName(e.target.value)}
              type="text"
              placeholder="Search..."
              className="w-full p-2 bg-neutral-800 text-white focus:outline-none"
            />
            <button
              className="btn btn-info"
              onClick={() => setNewInventory(true)}
            >
              New
            </button>
          </div>
          <table className=" w-full border-collapse mt-2">
            <thead>
              <tr className="bg-sky-950">
                <th className="p-2 py-1 text-start">Inventory Name</th>
                <th className="p-2 py-1 text-start">Inventory Category</th>
                <th className="p-2 py-1 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr className="p-2 hover:bg-neutral-800" key={item.id}>
                  <td className="px-2 py-1 text-start">
                    {item.inventory_name}
                  </td>
                  <td className="px-2 py-1 text-start">
                    {item.inventory_category}
                  </td>
                  <td className="px-2 py-1 text-end">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setModifyId(item.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventorySearch;
