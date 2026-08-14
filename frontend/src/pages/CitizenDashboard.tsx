/**
 * Citizen dashboard - redirects to Report Issue page (Phase 2 implementation)
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const CitizenDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new report page
    navigate('/report', { replace: true });
  }, [navigate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Report Issue page...</p>
      </div>
    </div>
  );
};
