import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PAGINATION_CONSTANTS } from '../constants/pagination';

interface UsePaginationOptions {
  moduleDefault?: keyof typeof PAGINATION_CONSTANTS.MODULE_DEFAULTS;
  preserveInUrl?: boolean;
}

interface PaginationState {
  page: number;
  limit: number;
  search: string;
}

interface PaginationResult extends PaginationState {
  offset: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  resetPagination: () => void;
  queryParams: URLSearchParams;
}

/**
 * Centralized pagination hook for consistent pagination across modules
 * 
 * Features:
 * - URL synchronization (optional)
 * - Module-specific defaults
 * - Search integration
 * - Consistent state management
 */
export function usePagination(options: UsePaginationOptions = {}): PaginationResult {
  const { moduleDefault, preserveInUrl = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get default limit for module or use global default
  const defaultLimit = moduleDefault && PAGINATION_CONSTANTS.MODULE_DEFAULTS[moduleDefault]
    ? PAGINATION_CONSTANTS.MODULE_DEFAULTS[moduleDefault]
    : PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE;
  
  // Initialize state from URL or defaults
  const getInitialState = (): PaginationState => {
    if (preserveInUrl) {
      const params = new URLSearchParams(location.search);
      const pageParam = params.get('page');
      const limitParam = params.get('limit');
      const searchParam = params.get('search');
      
      return {
        page: pageParam ? Math.max(1, parseInt(pageParam)) : PAGINATION_CONSTANTS.DEFAULT_PAGE,
        limit: limitParam ? 
          Math.min(
            PAGINATION_CONSTANTS.MAX_PAGE_SIZE,
            Math.max(PAGINATION_CONSTANTS.MIN_PAGE_SIZE, parseInt(limitParam))
          ) : defaultLimit,
        search: searchParam || ''
      };
    }
    
    return {
      page: PAGINATION_CONSTANTS.DEFAULT_PAGE,
      limit: defaultLimit,
      search: ''
    };
  };
  
  const [state, setState] = useState<PaginationState>(getInitialState);
  
  // Calculate offset
  const offset = useMemo(() => (state.page - 1) * state.limit, [state.page, state.limit]);
  
  // Update URL when state changes (if preserveInUrl is true)
  useEffect(() => {
    if (!preserveInUrl) return;
    
    const params = new URLSearchParams(location.search);
    
    // Update or remove page parameter
    if (state.page !== PAGINATION_CONSTANTS.DEFAULT_PAGE) {
      params.set('page', state.page.toString());
    } else {
      params.delete('page');
    }
    
    // Update or remove limit parameter
    if (state.limit !== defaultLimit) {
      params.set('limit', state.limit.toString());
    } else {
      params.delete('limit');
    }
    
    // Update or remove search parameter
    if (state.search) {
      params.set('search', state.search);
    } else {
      params.delete('search');
    }
    
    // Only navigate if URL actually changed
    const newSearch = params.toString();
    const currentSearch = location.search.substring(1); // Remove leading '?'
    
    if (newSearch !== currentSearch) {
      navigate(
        {
          pathname: location.pathname,
          search: newSearch ? `?${newSearch}` : ''
        },
        { replace: true }
      );
    }
  }, [state, preserveInUrl, navigate, location.pathname, location.search, defaultLimit]);
  
  // Setters with validation
  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      page: Math.max(1, page)
    }));
  }, []);
  
  const setLimit = useCallback((limit: number) => {
    setState(prev => ({
      ...prev,
      limit: Math.min(
        PAGINATION_CONSTANTS.MAX_PAGE_SIZE,
        Math.max(PAGINATION_CONSTANTS.MIN_PAGE_SIZE, limit)
      ),
      page: 1 // Reset to first page when limit changes
    }));
  }, []);
  
  const setSearch = useCallback((search: string) => {
    setState(prev => ({
      ...prev,
      search: search.trim(),
      page: 1 // Reset to first page when search changes
    }));
  }, []);
  
  const resetPagination = useCallback(() => {
    setState({
      page: PAGINATION_CONSTANTS.DEFAULT_PAGE,
      limit: defaultLimit,
      search: ''
    });
  }, [defaultLimit]);
  
  // Build query params for API calls
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', state.page.toString());
    params.set('limit', state.limit.toString());
    
    if (state.search && state.search.length >= PAGINATION_CONSTANTS.MIN_SEARCH_LENGTH) {
      params.set('search', state.search);
    }
    
    return params;
  }, [state]);
  
  return {
    page: state.page,
    limit: state.limit,
    search: state.search,
    offset,
    setPage,
    setLimit,
    setSearch,
    resetPagination,
    queryParams
  };
}