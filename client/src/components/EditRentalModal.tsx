import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from '../utils/axios';

interface Rental {
  _id: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: string;
}

interface EditRentalModalProps {
  rental: Rental;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditRentalModal({ rental, isOpen, onClose, onUpdate }: EditRentalModalProps) {
  const [startDate, setStartDate] = useState<Date>(new Date(rental.startDate));
  const [endDate, setEndDate] = useState<Date>(new Date(rental.endDate));
  const [status, setStatus] = useState(rental.status);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Add valid transitions map
  const validTransitions: { [key: string]: string[] } = {
    'pending': ['pending', 'approved', 'rejected', 'cancelled'],
    'approved': ['approved', 'pending', 'active', 'cancelled'],
    'active': ['active', 'approved', 'completed', 'cancelled'],
    'completed': ['completed', 'active'],
    'rejected': ['rejected', 'pending'],
    'cancelled': ['cancelled', 'pending', 'approved', 'active']
  };

  // Get valid status options based on current status
  const getValidStatusOptions = () => {
    return validTransitions[rental.status] || [];
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pending': 'Pending',
      'approved': 'Approved',
      'active': 'Active',
      'completed': 'Completed',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (status !== rental.status) {
        // Use the specific status update endpoint
        await axios.patch(`/vendor/rentals/${rental._id}/status`, { status });
      } else if (rental.status === 'pending') {
        // Only update dates for pending rentals using the general update endpoint
        await axios.patch(`/vendor/rentals/${rental._id}`, {
          startDate,
          endDate
        });
      }
      
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-gray-800 text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-white">
                      Edit Rental Details
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      {rental.status === 'pending' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-400">
                              Start Date
                            </label>
                            <DatePicker
                              selected={startDate}
                              onChange={(date: Date | null) => date && setStartDate(date)}
                              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              minDate={new Date()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400">
                              End Date
                            </label>
                            <DatePicker
                              selected={endDate}
                              onChange={(date: Date | null) => date && setEndDate(date)}
                              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              minDate={startDate}
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-400">
                          Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          {getValidStatusOptions().map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {getStatusLabel(statusOption)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {error && (
                        <div className="rounded-md bg-red-900/50 p-4">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                        >
                          {loading ? 'Updating...' : 'Update Rental'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-gray-600 sm:mt-0 sm:w-auto"
                          onClick={onClose}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 