export interface AppConnectionEndpointsCardProps {
  app: any;
  safeOnlineUrl: string;
  pendingEnvs: any[];
  setActiveTab: (tab: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
}
