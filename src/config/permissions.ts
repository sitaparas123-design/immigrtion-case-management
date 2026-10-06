export const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: ['create_client', 'view_clients', 'edit_client', 'delete_client', 'case.create', 'case.view', 'case.assign'],
  admin: ['create_client', 'view_clients', 'edit_client', 'delete_client', 'case.create', 'case.view', 'case.assign'],
  writer: ['view_clients', 'case.view'],
  reviewer: ['view_clients', 'case.view'],
  client: ['case.view', 'view_clients']
};
