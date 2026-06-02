import React from "react";

const PurchaseCosting = () => {
  return (
    <div className="flex flex-col  items-center justify-center w-full">
      <div className="flex flex-col w-full items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Purchase Costing
        </div>
        <form autoComplete="off" className="form-basic ">
          Pending Costing
        </form>
      </div>
    </div>
  );
};

export default PurchaseCosting;
