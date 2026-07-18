import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import { addonsApi } from './addons.api';

/** Active add-on catalog, flat — grouped into categories by the UI (design-system.md §3). */
export function useAddons() {
  return useQuery({
    queryKey: queryKeys.addons.list(),
    queryFn: addonsApi.list,
  });
}
