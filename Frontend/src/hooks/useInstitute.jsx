import { useContext } from 'react';
import { InstituteContext } from '../contexts/InstituteContext';

export const useInstitute = () => {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error('useInstitute must be used within an InstituteProvider');
  }
  return context;
};