// Client-side role permission checking utility

export function hasRoleAccess(userRole, allowedRoles) {
  if (!userRole) return false;
  if (!Array.isArray(allowedRoles)) {
    allowedRoles = [allowedRoles];
  }
  
  // Check exact match
  if (allowedRoles.includes(userRole)) return true;
  
  // Check for Developer roles (includes check)
  if (userRole.includes('Developer') && allowedRoles.some(role => role.includes('Developer'))) {
    return true;
  }
  
  // Super Admin has access to everything
  if (userRole === 'Super Admin') return true;
  
  return false;
}

export function checkPageAccess(userRole, pageRoles) {
  return hasRoleAccess(userRole, pageRoles);
}


