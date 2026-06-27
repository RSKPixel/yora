import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthContext from "./AuthContext";

const Basetemplate2 = ({ children }) => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const menu = {
    Masters: {
      Inventory: "/masters/inventory",
      Ledger: "/masters/ledger",
    },
    Transactions: {
      Purchase: "/transactions/purchase",
      Sales: "/transactions/sales",
      "Credit Note": "/transactions/creditnote",
    },
    Reports: {
      "Stock Report": "/reports/stockposition",
      "Stock Summary": "/reports/stocksummary",
      "Purchase Order Report": "/reports/purchaseorder",
    },
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Top Bar */}
      <div className="flex flex-row w-full justify-between items-center bg-sky-950 px-4 py-1 shadow text-stone-100 border-b border-sky-900">
        <div className="flex flex-col cursor-pointer hover:text-yellow-300">
          <Link to={"/"} className="text-xl text-center font-bold w-full">
            YORA ERP
          </Link>
          <span className="text-xs italic font-bold text-gray-400"></span>
        </div>
        <div className="ms-auto" />
        <div className="flex flex-col">
          {isAuthenticated && user && (
            <span className="font-bold flex flex-row gap-2 text-sm">
              {user.name}
            </span>
          )}
          {isAuthenticated && (
            <div className="flex flex-row gap-4 text-xs justify-center items-center  mt-1 text-grey-400">
              <Link
                className="hover:underline underline-offset-4"
                to={"/clientprofile"}
              >
                Profile
              </Link>
              <button
                type="button"
                className="hover:underline underline-offset-4"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-row text-stone-200 w-full flex-1 overflow-hidden">
        {/* Sidebar */}
        {isAuthenticated && (
          <div className="flex flex-col w-80 gap-2 h-full text-sm font-medium p-4 pe-6 border-r border-sky-900 bg-stone-900 overflow-y-auto">
            <ul>
              {Object.keys(menu).map((section) => (
                <li key={section} className="mb-4">
                  <div className="font-bold text-xs text-center border border-b-0 border-sky-900 bg-sky-950 text-stone-100 py-1 rounded-t-sm uppercase tracking-wide">
                    {section}
                  </div>
                  <ul className="border border-sky-900 rounded-b-sm overflow-hidden">
                    {Object.entries(menu[section]).map(
                      ([name, path], index, arr) => (
                        <li
                          key={name}
                          className={`bg-stone-900 px-2 py-1 hover:bg-stone-700 cursor-pointer ${index === arr.length - 1 ? "rounded-b-sm" : ""}`}
                        >
                          <Link
                            to={path}
                            className="block text-sm text-stone-100"
                          >
                            {name}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col w-full bg-stone-800 p-4 items-center overflow-y-scroll scrollbar-thin scrollbar-track-stone-800 scrollbar-thumb-sky-900">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Basetemplate2;
