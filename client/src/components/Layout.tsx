import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { NotificationDropdown } from "./NotificationDropdown";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link
                to={isAuthenticated ? "/dashboard" : "/"}
                className="text-white font-bold text-xl"
              >
                Rentoo
              </Link>
              {isAuthenticated && (
                <div className="hidden md:block ml-10">
                  <div className="flex items-baseline space-x-4">
                    <Link
                      to="/dashboard"
                      className={`${
                        location.pathname === "/dashboard"
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      } rounded-md px-3 py-2 text-sm font-medium`}
                    >
                      Dashboard
                    </Link>
                    {user?.role !== "admin" && (
                      <Link
                        to="/products"
                        className={`${
                          location.pathname === "/products"
                            ? "bg-gray-900 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        } rounded-md px-3 py-2 text-sm font-medium`}
                      >
                        Browse
                      </Link>
                    )}
                    {user?.role === "vendor" && (
                      <>
                        <Link
                          to="/vendor/products"
                          className={`${
                            location.pathname === "/vendor/products"
                              ? "bg-gray-900 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          } rounded-md px-3 py-2 text-sm font-medium`}
                        >
                          My Products
                        </Link>
                        <Link
                          to="/vendor/rentals"
                          className={`${
                            location.pathname === "/vendor/rentals"
                              ? "bg-gray-900 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          } rounded-md px-3 py-2 text-sm font-medium`}
                        >
                          Rentals
                        </Link>
                        <Link
                          to="/revenue"
                          className={`${
                            location.pathname === "/revenue"
                              ? "bg-gray-900 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          } rounded-md px-3 py-2 text-sm font-medium`}
                        >
                          Revenue
                        </Link>
                      </>
                    )}
                    {user?.role === "customer" && (
                      <Link
                        to="/customer/rentals"
                        className={`${
                          location.pathname === "/customer/rentals"
                            ? "bg-gray-900 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        } rounded-md px-3 py-2 text-sm font-medium`}
                      >
                        My Rentals
                      </Link>
                    )}
                    {user?.role !== "admin" && (
                      <Link
                        to="/chats"
                        className={`${
                          location.pathname === "/chats"
                            ? "bg-gray-900 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        } rounded-md px-3 py-2 text-sm font-medium`}
                      >
                        Chats
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <NotificationDropdown />
                  <Link
                    to="/profile"
                    className={`${
                      location.pathname === "/profile"
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    } rounded-md px-3 py-2 text-sm font-medium`}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
