import { useAppStore } from '@/lib/store';

export function useCampaignYear(): number {
  const year = useAppStore(s => s.campaign.campaignYear);
  return year || 3025;
}
