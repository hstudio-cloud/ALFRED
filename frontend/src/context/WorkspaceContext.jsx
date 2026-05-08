import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/env';

const WorkspaceContext = createContext();

const API = API_BASE_URL;

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/workspaces`);
      const nextWorkspaces = Array.isArray(response.data) ? response.data : [];
      setWorkspaces(nextWorkspaces);

      if (nextWorkspaces.length === 0) {
        setCurrentWorkspace(null);
        localStorage.removeItem('currentWorkspaceId');
        return;
      }

      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const currentWorkspaceStillAccessible = currentWorkspace
        ? nextWorkspaces.find((workspace) => workspace.id === currentWorkspace.id)
        : null;
      const savedWorkspaceStillAccessible = savedWorkspaceId
        ? nextWorkspaces.find((workspace) => workspace.id === savedWorkspaceId)
        : null;
      const resolvedWorkspace =
        currentWorkspaceStillAccessible
        || savedWorkspaceStillAccessible
        || nextWorkspaces[0];

      if (!currentWorkspace || currentWorkspace.id !== resolvedWorkspace.id) {
        setCurrentWorkspace(resolvedWorkspace);
      }
      localStorage.setItem('currentWorkspaceId', resolvedWorkspace.id);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchWorkspaces();
      return;
    }
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setLoading(false);
    localStorage.removeItem('currentWorkspaceId');
  }, [isAuthenticated, fetchWorkspaces]);

  const switchWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace.id);
  };

  const createWorkspace = async (name, subdomain, description) => {
    try {
      const response = await axios.post(`${API}/workspaces`, {
        name,
        subdomain,
        description
      });
      
      const newWorkspace = response.data;
      setWorkspaces([...workspaces, newWorkspace]);
      switchWorkspace(newWorkspace);
      
      return { success: true, workspace: newWorkspace };
    } catch (error) {
      console.error('Error creating workspace:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erro ao criar empresa' 
      };
    }
  };

  const value = {
    workspaces,
    currentWorkspace,
    loading,
    switchWorkspace,
    createWorkspace,
    refreshWorkspaces: fetchWorkspaces
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
