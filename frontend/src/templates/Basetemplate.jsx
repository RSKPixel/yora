import React, { useState } from "react";
import { Link, Outlet } from "react-router-dom";

const Basetemplate = ({ children }) => {
  const [selectedMenuItem, setSelectedMenuItem] = useState("Portfolio");
  const [loggedIn, setLoggedIn] = useState(true);

  const menuItems = [
    { name: "Portfolio", link: "/" },
    { name: "User", link: "/client-master" },
  ];

  return (
    <div className="flex flex-col text-sm tracking-wide uppercase h-screen">
      <nav className="bg-cyan-950 border-b border-cyan-600 px-4 py-3 w-full fixed">
        <div className="flex flex-row mx-auto justify-between items-center">
          <div className="font-bold text-white cursor-pointer">
            YORA - PET ERP
          </div>
          <div className="flex flex-row gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className={`font-bold hover:text-red-400 underline-offset-4 ${selectedMenuItem == item.name ? "underline text-red-400" : "text-white"}`}
              >
                {item.name}
              </Link>
            ))}
            {loggedIn && (
              <Link
                to="/logout"
                className="text-yellow-400 font-semibold hover:text-yellow-500"
              >
                Logout
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-12">
        <div className="flex flex-row">
          {/* sidebar */}
          <div className="flex flex-col w-64 h-full border-r border-cyan-600">
            <div className="p-4 text-white font-bold">Sidebar</div>
          </div>
          {/* main content */}
          <div className="flex-1 p-4"> {children}</div>
        </div>
      </main>
    </div>
  );
};

export default Basetemplate;
