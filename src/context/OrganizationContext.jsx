
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query organization_members to get org IDs, then join (or just fetch if we have a view)
      // Since we just have tables, we do a join.
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations (
            id,
            name,
            plan_key
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Extract organizations from the response
      const orgs = data.map(item => ({
        ...item.organization,
        role: item.role
      }));

      setOrganizations(orgs);

      // Set default org (first one or from local storage)
      const cachedOrgId = localStorage.getItem('currentOrgId');
      const foundCached = orgs.find(o => o.id === cachedOrgId);
      
      if (foundCached) {
        setCurrentOrg(foundCached);
      } else if (orgs.length > 0) {
        setCurrentOrg(orgs[0]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    
    // Listen for auth changes to refetch
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchOrganizations();
      } else if (event === 'SIGNED_OUT') {
        setOrganizations([]);
        setCurrentOrg(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update current org and persist
  const switchOrganization = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('currentOrgId', org.id);
    }
  };

  const value = {
    organizations,
    currentOrg,
    switchOrganization,
    fetchOrganizations,
    loading
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
