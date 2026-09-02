import { initializers } from '@dropins/tools/initializer.js';
import { events } from '@dropins/tools/event-bus.js';
import {
  config,
  getCompanyHeaderManager,
  getCustomerCompanyInfo,
  getGroupHeaderManager,
  initialize,
  setEndpoint,
} from '@dropins/storefront-company-switcher/api.js';
import { initializeDropin } from './index.js';
import { CORE_FETCH_GRAPHQL, CS_FETCH_GRAPHQL } from '../commerce.js';

await initializeDropin(async () => {
  // Set Fetch GraphQL (Core)
  setEndpoint(CORE_FETCH_GRAPHQL);

  // Initialize company switcher
  const initializer = await initializers.mountImmediately(initialize, {
    fetchGraphQlModules: [CORE_FETCH_GRAPHQL, CS_FETCH_GRAPHQL],
    groupGraphQlModules: [CS_FETCH_GRAPHQL],
  });

  // The company-switcher drop-in only establishes context automatically when
  // there are multiple companies to choose from. A single-company buyer still
  // needs both headers so Catalog Service returns shared-catalog pricing.
  if (!getGroupHeaderManager().isGroupHeaderSet()) {
    const companyContext = await getCustomerCompanyInfo();
    const companyId = companyContext.currentCompany?.id;
    const { customerGroupId } = companyContext;

    if (companyId && customerGroupId) {
      getCompanyHeaderManager().setCompanyHeaders(companyId);
      getGroupHeaderManager().setGroupHeaders(customerGroupId);
      sessionStorage.setItem(config.getConfig().companySessionStorageKey, companyId);
      sessionStorage.setItem(config.getConfig().groupSessionStorageKey, customerGroupId);
      events.emit('companyContext/changed', companyId);
    }
  }

  return initializer;
})();
