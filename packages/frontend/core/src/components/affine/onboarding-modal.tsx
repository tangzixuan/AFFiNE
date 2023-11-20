import { TourModal } from '@affine/component/tour-modal';
import { useAtom } from 'jotai';
import { memo, useCallback } from 'react';

import { openOnboardingModalAtom } from '../../atoms';
import { guideOnboardingAtom } from '../../atoms/guide';

export const OnboardingModal = memo(function OnboardingModal() {
  const [open, setOpen] = useAtom(openOnboardingModalAtom);
  const [guideOpen, setShowOnboarding] = useAtom(guideOnboardingAtom);
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      setShowOnboarding(false);
      setOpen(false);
    },
    [setOpen, setShowOnboarding]
  );

  return (
    <TourModal open={!open ? guideOpen : open} onOpenChange={onOpenChange} />
  );
});
