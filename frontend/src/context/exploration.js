import { createContext, useContext } from 'react';
export const ExplorationContext = createContext(null);
export const useExploration = () => useContext(ExplorationContext);
