import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createIssue } from '../services/api';
import { ISSUE_CATEGORIES, Location, IssueCreateResponse } from '../types';
import Map, { useCurrentLocation } from '../components/Map';
import { MapPin, X, Camera, AlertCircle } from 'lucide-react';

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { location: currentLocation, loading: locationLoading, error: locationError, getCurrentLocation } = useCurrentLocation();

  // Form state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect non-citizens
  React.useEffect(() => {
    if (!user || user.role !== 'citizen') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Handle image selection
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Please select a JPG, PNG, or WEBP image' }));
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, image: 'Image must be smaller than 5MB' }));
      return;
    }

    // Clear errors and set image
    setErrors(prev => ({ ...prev, image: '' }));
    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Remove selected image
  const removeImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle current location selection
  const handleUseCurrentLocation = useCallback(() => {
    if (currentLocation) {
      setLocation(currentLocation);
      setAddress(`${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`);
      setErrors(prev => ({ ...prev, location: '' }));
    } else {
      getCurrentLocation();
    }
  }, [currentLocation, getCurrentLocation]);

  // Handle location selection from map
  const handleLocationSelect = useCallback((newLocation: Location) => {
    setLocation(newLocation);
    setAddress(`${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)}`);
    setErrors(prev => ({ ...prev, location: '' }));
  }, []);

  // Update location when currentLocation changes
  React.useEffect(() => {
    if (currentLocation && !location) {
      handleLocationSelect(currentLocation);
    }
  }, [currentLocation, location, handleLocationSelect]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!selectedImage) {
      newErrors.image = 'Please select an image of the issue';
    }

    if (!category) {
      newErrors.category = 'Please select an issue category';
    }

    if (!location) {
      newErrors.location = 'Please select or provide location information';
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedImage, category, location, description]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('image', selectedImage!);
      formData.append('category', category);
      formData.append('latitude', location!.lat.toString());
      formData.append('longitude', location!.lng.toString());
      
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      
      if (address.trim()) {
        formData.append('address', address.trim());
      }

      const response: IssueCreateResponse = await createIssue(formData);
      
      // Show success message and navigate
      const message = response.is_duplicate 
        ? `Issue reported successfully! We found ${response.duplicate_count} similar reports in your area.`
        : 'Issue reported successfully! Our AI analysis has been completed.';
        
      alert(message);
      navigate('/my-issues');
      
    } catch (error: any) {
      console.error('Failed to submit issue:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to submit issue. Please try again.';
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, selectedImage, category, location, description, address, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
          <p className="text-gray-600">
            Help improve your community by reporting civic issues. Our AI will analyze your report and prioritize it appropriately.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Photo *
            </label>
            
            {!selectedImage ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  errors.image ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium mb-1">Click to upload photo</p>
                <p className="text-sm text-gray-500">JPG, PNG, or WEBP • Max 5MB</p>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={imagePreview!} 
                  alt="Issue preview" 
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {errors.image && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.image}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Issue Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category...</option>
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.category}
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {locationLoading ? 'Getting location...' : 'Use My Current Location'}
              </button>

              {location && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Location:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Interactive Map */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  Click on map to select or adjust location:
                </label>
                <Map
                  center={location || { lat: 40.7128, lng: -74.0060 }}
                  zoom={location ? 15 : 10}
                  height="300px"
                  selectedLocation={location}
                  onLocationSelect={handleLocationSelect}
                  className="border border-gray-300 rounded-md"
                />
              </div>

              <input
                type="text"
                placeholder="Or enter address/landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(errors.location || locationError) && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.location || locationError}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail... (optional)"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-1">
              <span className="text-sm text-gray-500">
                {description.length}/500 characters
              </span>
              {errors.description && (
                <span className="text-sm text-red-600">{errors.description}</span>
              )}
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Analyzing & Reporting...' : 'Analyze & Report Issue'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Our AI will analyze your photo and description</li>
            <li>• We'll check for similar issues in your area</li>
            <li>• Priority will be assigned based on severity and safety risk</li>
            <li>• You can track progress in "My Issues"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}