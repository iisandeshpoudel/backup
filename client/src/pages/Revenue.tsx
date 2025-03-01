import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "../utils/axios";

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  revenueByProduct: {
    productId: string;
    productName: string;
    revenue: number;
  }[];
}

export default function Revenue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    revenueByProduct: [],
  });

  useEffect(() => {
    const fetchRevenueStats = async () => {
      try {
        const response = await axios.get("/vendor/revenue-stats");
        setStats(response.data);
      } catch (err) {
        setError("Failed to load revenue statistics");
        console.error("Revenue stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">
            Revenue Overview
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Detailed breakdown of your rental revenue
          </p>
        </div>
      </div>

      {/* Revenue Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: "Total Revenue", amount: stats.totalRevenue },
          { name: "Monthly Revenue", amount: stats.monthlyRevenue },
          { name: "Weekly Revenue", amount: stats.weeklyRevenue },
          { name: "Daily Revenue", amount: stats.dailyRevenue },
        ].map((item) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-lg bg-gray-800 px-4 py-5 shadow sm:px-6"
          >
            <dt className="truncate text-sm font-medium text-gray-400">
              {item.name}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-white">
              Rs.{" "}
              {item.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </dd>
          </motion.div>
        ))}
      </div>

      {/* Revenue by Product */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-white">Revenue by Product</h2>
        <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
              {stats.revenueByProduct.length > 0 ? (
                <ul role="list" className="-my-5 divide-y divide-gray-700">
                  {stats.revenueByProduct.map((product) => (
                    <motion.li
                      key={product.productId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {product.productName}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="text-sm text-gray-400">
                            Rs.{" "}
                            {product.revenue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="py-4 text-center text-gray-400">
                  No revenue data available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
