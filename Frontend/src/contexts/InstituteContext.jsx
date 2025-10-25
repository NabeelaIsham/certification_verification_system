import { createContext, useState, useCallback } from 'react';

export const InstituteContext = createContext();

export const InstituteProvider = ({ children }) => {
  const [currentInstitute, setCurrentInstitute] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setInstitute = useCallback((institute) => {
    if (!institute || !institute.id) {
      setError('Invalid institute object');
      return;
    }
    setCurrentInstitute(institute);
    setError(null);
  }, []);

  const updateInstitute = useCallback((updatedInstitute) => {
    if (!updatedInstitute?.id) {
      setError('Invalid institute object for update');
      return;
    }
    
    setCurrentInstitute(updatedInstitute);
    setInstitutes(prev => 
      prev.map(inst => 
        inst.id === updatedInstitute.id ? updatedInstitute : inst
      )
    );
    setError(null);
  }, []);

  const addInstitute = useCallback((institute) => {
    if (!institute?.id) {
      setError('Invalid institute object');
      return;
    }
    
    // Check for duplicates
    if (institutes.find(inst => inst.id === institute.id)) {
      setError('Institute already exists');
      return;
    }
    
    setInstitutes(prev => [...prev, institute]);
    setError(null);
  }, [institutes]);

  const removeInstitute = useCallback((instituteId) => {
    setInstitutes(prev => prev.filter(inst => inst.id !== instituteId));
    
    // Clear current institute if it's the one being removed
    if (currentInstitute?.id === instituteId) {
      setCurrentInstitute(null);
    }
    setError(null);
  }, [currentInstitute]);

  const setAllInstitutes = useCallback((institutesList) => {
    if (!Array.isArray(institutesList)) {
      setError('Institutes must be an array');
      return;
    }
    setInstitutes(institutesList);
    setError(null);
  }, []);

  const clearInstitute = useCallback(() => {
    setCurrentInstitute(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    currentInstitute,
    institutes,
    setInstitute,
    updateInstitute,
    addInstitute,
    removeInstitute,
    setAllInstitutes,
    clearInstitute,
    loading,
    setLoading,
    error,
    clearError
  };

  return (
    <InstituteContext.Provider value={value}>
      {children}
    </InstituteContext.Provider>
  );
};