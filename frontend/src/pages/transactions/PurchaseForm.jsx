import React from "react";
import moment from "moment";
import numeral from "numeral";

const Field = ({ label, icon, children }) => (
  <div className="space-y-2">
    <label className="page-form-label">{label}</label>
    <div className="page-field-wrap">
      <span className="page-field-icon" aria-hidden="true">
        <i className={`bi ${icon}`}></i>
      </span>
      {children}
    </div>
  </div>
);

const PurchaseForm = ({
  purchase,
  purchaseDetails,
  formMessage,
  onBack,
  onUpdateExpenses,
  onUpdatePurchase,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-secondary flex items-center gap-1.5 normal-case tracking-normal"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left"></i>
          Back to list
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        <aside className="w-full lg:w-72 shrink-0 space-y-3">
          <section className="rounded-lg border border-gray-700/80 bg-neutral-800/50 p-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">
              Purchase
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/40">Purchase ID</dt>
                <dd className="font-semibold text-white/90 mt-0.5">{purchase.purchase_id}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/40">Date</dt>
                <dd className="font-semibold text-white/90 mt-0.5">
                  {moment(purchase.purchase_date).format("DD-MM-YYYY")}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/40">Vendor</dt>
                <dd className="font-semibold text-white/90 mt-0.5 wrap-break-word">
                  {purchase.vendor}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-sky-800/60 bg-neutral-800/60 p-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-3">
              Totals
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-white/50 normal-case tracking-normal">Cartons</dt>
                <dd className="font-semibold text-white/90 tabular-nums">
                  {numeral(purchase.carton).format("0,0")}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-white/50 normal-case tracking-normal">Quantity</dt>
                <dd className="font-semibold text-white/90 tabular-nums">
                  {numeral(purchase.qty).format("0,0")}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col gap-4">
          <section className="rounded-lg border border-sky-900/40 bg-neutral-800/50 p-4">
            <Field label="Transport & Handling Expenses" icon="bi-truck">
              <input
                type="number"
                id="transport"
                className="page-field-input page-field-input-number"
                onChange={onUpdateExpenses}
                value={purchase.expenses || 0}
                min="0"
                step="0.01"
              />
            </Field>

            {formMessage && (
              <div
                className={`flex items-center gap-2 text-xs mt-3 normal-case tracking-normal ${
                  formMessage.type === "success" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                <i
                  className={`bi ${
                    formMessage.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"
                  }`}
                ></i>
                {formMessage.message}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                type="button"
                className="btn btn-primary flex items-center gap-1.5"
                onClick={onUpdatePurchase}
              >
                <i className="bi bi-check-lg"></i>
                Update
              </button>
            </div>
          </section>

          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Carton</th>
                  <th className="text-end">List Price</th>
                  <th className="text-end">Cost Price</th>
                  <th className="text-end">Expenses</th>
                  <th className="text-end">Landing Cost</th>
                  <th className="text-end">Cost + GST</th>
                </tr>
              </thead>
              <tbody>
                {purchaseDetails?.length > 0 ? (
                  purchaseDetails.map((item, index) => (
                    <tr key={index}>
                      <td>{item.stock_item}</td>
                      <td className="text-end">{numeral(item.qty).format("0,0")}</td>
                      <td className="text-end">{numeral(item.carton).format("0,0")}</td>
                      <td className="text-end">{numeral(item.list_price).format("0,0.00")}</td>
                      <td className="text-end">{numeral(item.cost_price).format("0,0.00")}</td>
                      <td className="text-end">{numeral(item.expenses).format("0,0.00")}</td>
                      <td className="text-end">{numeral(item.landing_cost).format("0,0.00")}</td>
                      <td className="text-end">{numeral(item.cost_with_gst).format("0,0.00")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="page-table-empty">
                      No line items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PurchaseForm;
