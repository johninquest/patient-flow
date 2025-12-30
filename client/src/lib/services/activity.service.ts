import { api } from '$lib/api/client';
import type { Activity, ActivityFilters } from '$lib/types/activity.types';

export const activityService = {
  /**
   * Get activity feed for a property
   */
  async getPropertyActivityFeed(
    propertyId: string,
    filters?: ActivityFilters
  ): Promise<Activity[]> {
    const params = new URLSearchParams();
    
    if (filters?.user_id) {
      params.append('user_id', filters.user_id);
    }
    
    if (filters?.action) {
      params.append('action', filters.action);
    }
    
    if (filters?.days) {
      params.append('days', filters.days.toString());
    }

    const queryString = params.toString();
    const url = `/activity/property/${propertyId}${queryString ? `?${queryString}` : ''}`;
    
    return api.get<Activity[]>(url);
  }
};