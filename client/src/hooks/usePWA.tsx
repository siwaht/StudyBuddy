import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isIOSStandalone;
      setIsInstalled(isInstalled);
      return isInstalled;
    };

    checkIfInstalled();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "AgentPlatform has been successfully installed on your device.",
      });
    };

    // Listen for service worker updates via custom events
    const handleSWUpdate = (event: Event) => {
      setIsUpdateAvailable(true);
      toast({
        title: "Update Available",
        description: "A new version of AgentPlatform is available. Please refresh to update.",
        variant: "default",
      });
    };

    const handleControllerChange = () => {
      // App has been updated, reload the page
      window.location.reload();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('sw-update-available', handleSWUpdate);

    // Listen for service worker controller change (app updated)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // Check for waiting service worker immediately
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setIsUpdateAvailable(true);
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleSWUpdate);
      }
    };
  }, [toast]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      // Fallback for iOS Safari or other browsers
      toast({
        title: "Install AgentPlatform",
        description: "To install this app, use your browser's 'Add to Home Screen' option.",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Error during app installation:', error);
      toast({
        title: "Installation Error",
        description: "There was an error installing the app. Please try again.",
        variant: "destructive",
      });
    }
  }, [deferredPrompt, toast]);

  const updateApp = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      } catch (error) {
        console.error('Error updating app:', error);
        toast({
          title: "Update Error",
          description: "There was an error updating the app. Please refresh manually.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const shareApp = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AgentPlatform',
          text: 'Check out this AI Voice Agent Management Platform!',
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        toast({
          title: "Link Copied",
          description: "App link has been copied to your clipboard.",
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }, [toast]);

  return {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    installApp,
    updateApp,
    shareApp,
  };
}