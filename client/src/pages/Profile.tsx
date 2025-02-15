import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, error, updateProfile, clearError } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage('');

    try {
      const updateData: { name?: string; currentPassword?: string; newPassword?: string } = {};
      
      // Only include name if it's different from current name
      if (name !== user?.name) {
        updateData.name = name;
      }

      // Only include password fields if both are provided
      if (currentPassword && newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      // Only make the API call if there are changes
      if (Object.keys(updateData).length > 0) {
        await updateProfile(updateData);
        setSuccessMessage('Profile updated successfully');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 text-red-500 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900/50 text-green-500 p-3 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input mt-1"
            minLength={2}
            maxLength={50}
          />
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input mt-1"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input mt-1"
                minLength={6}
              />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
} 