import React, { useContext, useEffect, useState } from "react";
import moment from "moment";
import AuthContext from "../../templates/AuthContext";

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

const DeliveryChallan = ({
  salesInvoice,
  setShowDeliveryChallan,
  setRefresh,
  refresh,
}) => {
  const { api, authFetch } = useContext(AuthContext);
  const [formMessage, setFormMessage] = useState(null);
  const [deliveryChallan, setDeliveryChallan] = useState({
    delivery_no: "new",
    invoice_no: salesInvoice.invoice_no,
    invoice_date: salesInvoice.invoice_date,
    buyer: salesInvoice.buyer,
    delivery_date: moment().format("YYYY-MM-DD"),
    delivery_location: "",
    vehicle_no: "",
    driver_name: "",
    delivered_by: "",
  });

  const isNew = deliveryChallan.delivery_no === "new";

  useEffect(() => {
    const fd = new FormData();
    fd.append("invoice_no", salesInvoice.invoice_no);
    fd.append("invoice_date", salesInvoice.invoice_date);
    authFetch(`${api}/delivery/search`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setDeliveryChallan(data.data);
        } else if (data.status === "error") {
          setDeliveryChallan((prev) => ({ ...prev, delivery_no: "new" }));
        }
      });
  }, [api, salesInvoice.invoice_no, salesInvoice.invoice_date]);

  const handleChange = (e) => {
    setDeliveryChallan({ ...deliveryChallan, [e.target.name]: e.target.value });
    setFormMessage(null);
  };

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append("delivery_no", deliveryChallan.delivery_no);
    fd.append("delivery_date", deliveryChallan.delivery_date);
    fd.append("invoice_no", deliveryChallan.invoice_no);
    fd.append("invoice_date", deliveryChallan.invoice_date);
    fd.append("buyer", deliveryChallan.buyer);
    fd.append("vehicle_no", deliveryChallan.vehicle_no);
    fd.append("driver_name", deliveryChallan.driver_name);
    fd.append("delivery_location", deliveryChallan.delivery_location);
    fd.append("delivered_by", deliveryChallan.delivered_by);

    const endpoint = isNew ? `${api}/delivery/create` : `${api}/delivery/update`;

    authFetch(endpoint, { method: "POST", body: fd })
      .then((response) => response.json())
      .then((data) => {
        setFormMessage({ type: data.status, message: data.message });
        setRefresh(!refresh);
      });
  };

  const handleDelete = () => {
    const fd = new FormData();
    fd.append("delivery_no", deliveryChallan.delivery_no);
    authFetch(`${api}/delivery/delete`, { method: "POST", body: fd })
      .then((response) => response.json())
      .then((data) => {
        setFormMessage({ type: data.status, message: data.message });
        setRefresh(!refresh);
        setShowDeliveryChallan(false);
      });
  };

  return (
    <div className="page-modal-overlay">
      <div className="page-modal page-modal-wide">
        <div className="page-modal-header">
          <span className="page-modal-title flex items-center gap-2">
            <span className="page-card-title-icon">
              <i className="bi bi-truck"></i>
            </span>
            Delivery Challan
          </span>
          <button
            type="button"
            className="page-modal-close"
            onClick={() => setShowDeliveryChallan(false)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="flex flex-row flex-1 min-h-0 bg-neutral-900 max-h-[calc(90vh-52px)]">
          <aside className="w-72 shrink-0 flex flex-col gap-3 p-4 border-r border-gray-700/80 overflow-y-auto">
            <section className="rounded-lg border border-gray-700/80 bg-neutral-800/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">
                Invoice
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Invoice No</dt>
                  <dd className="font-semibold text-white/90 mt-0.5">{deliveryChallan.invoice_no}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Invoice Date</dt>
                  <dd className="font-semibold text-white/90 mt-0.5">
                    {moment(deliveryChallan.invoice_date).format("DD-MM-YYYY")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Buyer</dt>
                  <dd className="font-semibold text-white/90 mt-0.5 wrap-break-word">
                    {deliveryChallan.buyer}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              className={`rounded-lg border p-3 ${isNew
                ? "border-amber-500/40 bg-amber-950/20"
                : "border-emerald-500/40 bg-emerald-950/20"
                }`}
            >
              <dt className="text-[10px] uppercase tracking-wider text-white/40">Challan No</dt>
              <dd
                className={`text-lg font-bold mt-1 normal-case tracking-normal ${isNew ? "text-amber-400" : "text-emerald-400"
                  }`}
              >
                {isNew ? "New" : deliveryChallan.delivery_no}
              </dd>
              <p className="text-[10px] text-white/40 mt-2 normal-case tracking-normal">
                {isNew ? "Will be assigned on submit" : "Existing delivery record"}
              </p>
            </section>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col min-h-0">
            <form autoComplete="off" className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Delivery Date" icon="bi-calendar-event">
                  <input
                    type="date"
                    name="delivery_date"
                    className="page-field-input"
                    value={deliveryChallan.delivery_date}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Vehicle No" icon="bi-truck">
                  <input
                    type="text"
                    name="vehicle_no"
                    className="page-field-input"
                    value={deliveryChallan.vehicle_no}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Driver Name" icon="bi-person">
                  <input
                    type="text"
                    name="driver_name"
                    className="page-field-input"
                    value={deliveryChallan.driver_name}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Delivered By" icon="bi-person-check">
                  <input
                    type="text"
                    name="delivered_by"
                    className="page-field-input"
                    value={deliveryChallan.delivered_by}
                    onChange={handleChange}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Delivery Location" icon="bi-geo-alt">
                    <input
                      type="text"
                      name="delivery_location"
                      className="page-field-input"
                      value={deliveryChallan.delivery_location}
                      onChange={handleChange}
                    />
                  </Field>
                </div>
              </div>
            </form>

            <div className="shrink-0 border-t border-gray-700/80 px-4 py-3 bg-neutral-800/40">
              {formMessage && (
                <div
                  className={`flex items-center justify-center gap-2 text-xs mb-3 normal-case tracking-normal ${formMessage.type === "success" ? "text-emerald-400" : "text-red-400"
                    }`}
                >
                  <i
                    className={`bi ${formMessage.type === "success"
                      ? "bi-check-circle"
                      : "bi-exclamation-circle"
                      }`}
                  ></i>
                  {formMessage.message}
                </div>
              )}

              <div className="flex flex-row gap-2 justify-between items-center">
                <button
                  type="button"
                  className="btn btn-info flex items-center gap-1.5"
                  onClick={handleDelete}
                  disabled={isNew}
                >
                  <i className="bi bi-trash"></i>
                  Delete
                </button>
                <span className="flex flex-row gap-2">
                  <button type="button" className="btn btn-primary w-28" onClick={handleSubmit}>
                    Submit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger w-28"
                    onClick={() => setShowDeliveryChallan(false)}
                  >
                    Cancel
                  </button>
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallan;
