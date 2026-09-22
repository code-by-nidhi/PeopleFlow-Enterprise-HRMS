import { MANAGEMENT_ROLES, ORG_EDITORS, ROLES } from './constants';

export const isManagement = (user) => MANAGEMENT_ROLES.includes(user?.role);
export const canEditOrganisation = (user) => ORG_EDITORS.includes(user?.role);
export const isAdmin = (user) => user?.role === ROLES.ADMIN;
export const hasRole = (user, roles) => !roles || roles.includes(user?.role);
