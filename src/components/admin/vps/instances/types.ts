export interface VPSInstanceService {
  id?: string | undefined;
  domain?: string | null | undefined;
  status?: string | null | undefined;
  user_id?: string | undefined;
  profile?: {
    full_name?: string | null | undefined;
    email?: string | null | undefined;
  } | null | undefined;
  products?: {
    id?: string | undefined;
    name?: string | null | undefined;
    product_type?: string | null | undefined;
  } | null | undefined;
  [key: string]: any;
}

export interface AdminVPSInstance {
  id: string;
  external_id?: string | null | undefined;
  ip_address?: string | null | undefined;
  name?: string | null | undefined;
  status?: string | null | undefined;
  user_id?: string | null | undefined;
  region?: string | null | undefined;
  os_template?: string | null | undefined;
  ssh_host?: string | null | undefined;
  ssh_port?: number | null | undefined;
  ssh_user?: string | null | undefined;
  ssh_password?: string | null | undefined;
  service?: VPSInstanceService | null | undefined;
  [key: string]: any;
}

export interface EditInstanceValues {
  id: string;
  external_id?: string | null | undefined;
  ip_address?: string | null | undefined;
  status?: string | null | undefined;
}

export interface SSHConfigValues {
  id: string;
  ssh_host?: string | undefined;
  ssh_port?: number | undefined;
  ssh_user?: string | undefined;
  ssh_password?: string | undefined;
}

export interface ExternalContaboInstance {
  instanceId: string | number;
  displayName?: string | undefined;
  name?: string | undefined;
  ipAddress?: string | undefined;
  status?: string | undefined;
  [key: string]: any;
}

export interface SimpleClient {
  id: string;
  full_name?: string | null | undefined;
  email?: string | null | undefined;
}

export interface ClientServiceOption {
  id: string;
  domain?: string | null | undefined;
  status?: string | null | undefined;
  products?: {
    name?: string | null | undefined;
    product_type?: string | null | undefined;
  } | null | undefined;
  [key: string]: any;
}

export interface AdminVPSHeaderProps {
  isSyncing: boolean;
  onSyncClick: () => void;
}

export interface VPSInstancesTableProps {
  instances: AdminVPSInstance[];
  editingId: string | null;
  editValues: EditInstanceValues;
  isActionPending: boolean;
  onEditChange: (values: EditInstanceValues) => void;
  onStartEdit: (vps: AdminVPSInstance) => void;
  onSaveEdit: (values: EditInstanceValues) => void;
  onAction: (instanceId: string, action: 'start' | 'stop' | 'restart' | 'reinstall') => void;
  onConfigureSSH: (vps: AdminVPSInstance) => void;
}

export interface SyncContaboModalProps {
  isOpen: boolean;
  isSyncing: boolean;
  externalInstances?: ExternalContaboInstance[] | undefined;
  instances?: AdminVPSInstance[] | undefined;
  onOpenChange: (open: boolean) => void;
  onAssignClick: (instance: ExternalContaboInstance) => void;
}

export interface AssignInstanceModalProps {
  isOpen: boolean;
  selectedInstance: ExternalContaboInstance | null;
  clients?: SimpleClient[] | undefined;
  clientServices?: ClientServiceOption[] | undefined;
  selectedClientId: string;
  selectedServiceId: string;
  isAssignPending: boolean;
  onOpenChange: (open: boolean) => void;
  onClientChange: (clientId: string) => void;
  onServiceChange: (serviceId: string) => void;
  onConfirmAssign: () => void;
}

export interface SSHConfigModalProps {
  isOpen: boolean;
  sshValues: SSHConfigValues;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (values: SSHConfigValues) => void;
  onSave: () => void;
}
