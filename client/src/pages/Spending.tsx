import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "../utils/axios";

interface SpendingStats {
  totalSpent: number;
  monthlySpent: number;
  weeklySpent: number;
  dailySpent: number;
  spendingByProduct: {
    productId: string;
    productName: string;
    spent: number;
  }[];
}

export default function Spending() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SpendingStats>({
    totalSpent: 0,
    monthlySpent: 0,
    weeklySpent: 0,
    dailySpent: 0,
    spendingByProduct: [],
  });

  useEffect(() => {
    const fetchSpendingStats = async () => {
      try {
        const response = await axios.get("/customer/spending-stats");
        setStats(response.data);
      } catch (err) {
        setError("Failed to load spending statistics");
        console.error("Spending stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpendingStats();
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
            Spending Overview
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Detailed breakdown of your rental spending
          </p>
        </div>
      </div>

      {/* Spending Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: "Total Spent", amount: stats.totalSpent },
          { name: "Monthly Spent", amount: stats.monthlySpent },
          { name: "Weekly Spent", amount: stats.weeklySpent },
          { name: "Daily Spent", amount: stats.dailySpent },
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

      {/* Spending by Product */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-white">Spending by Product</h2>
        <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
              {stats.spendingByProduct.length > 0 ? (
                <ul role="list" className="-my-5 divide-y divide-gray-700">
                  {stats.spendingByProduct.map((product) => (
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
                            {product.spent.toLocaleString(undefined, {
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
                  No spending data available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
