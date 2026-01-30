import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import PurchasesUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useUser } from './user-context';
import { useLanguage } from './language-context';
import { revenueCatConfig } from '../config/revenuecat';
import { persistPremiumStatus } from '../utils/premium-status';

type PremiumContextValue = {
    isPremium: boolean;
    isLoading: boolean;
    customerInfo: CustomerInfo | null;
    refresh: () => Promise<void>;
    presentPaywall: () => Promise<void>;
    presentPaywallIfNeeded: () => Promise<void>;
    restorePurchases: () => Promise<void>;
    openCustomerCenter: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

const resolvePremium = (info: CustomerInfo | null) =>
    Boolean(info?.entitlements?.active?.[revenueCatConfig.entitlementId]);

export function PremiumProvider({ children }: { children: ReactNode }) {
    const { state: userState } = useUser();
    const { t } = useLanguage();
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const configuredRef = useRef(false);
    const configuredUserRef = useRef<string | null>(null);
    const listenerAddedRef = useRef(false);
    const logHandlerConfiguredRef = useRef(false);

    const applyCustomerInfo = useCallback(async (info: CustomerInfo | null) => {
        setCustomerInfo(info);
        const premium = resolvePremium(info);
        setIsPremium(premium);
        const userId = configuredUserRef.current;
        if (userId) {
            await persistPremiumStatus(userId, premium);
        }
    }, []);

    const refresh = useCallback(async () => {
        try {
            const info = await Purchases.getCustomerInfo();
            await applyCustomerInfo(info);
        } catch (error) {
            console.warn('RevenueCat customer info error:', error);
        }
    }, [applyCustomerInfo]);

    useEffect(() => {
        const userId = userState.user?.uid;
        if (!userId) {
            return;
        }

        const configure = async () => {
            try {
                if (__DEV__ && !logHandlerConfiguredRef.current) {
                    Purchases.setLogHandler((logLevel, message) => {
                        if (message?.includes('Purchase failure simulated successfully in Test Store.')) {
                            // Avoid LogBox red screen for expected Test Store failures in dev.
                            console.debug(`[RevenueCat] ${message}`);
                            return;
                        }
                        switch (logLevel) {
                            case LOG_LEVEL.DEBUG:
                                console.debug(`[RevenueCat] ${message}`);
                                break;
                            case LOG_LEVEL.INFO:
                                console.info(`[RevenueCat] ${message}`);
                                break;
                            case LOG_LEVEL.WARN:
                                console.warn(`[RevenueCat] ${message}`);
                                break;
                            case LOG_LEVEL.ERROR:
                                console.error(`[RevenueCat] ${message}`);
                                break;
                            default:
                                console.log(`[RevenueCat] ${message}`);
                        }
                    });
                    logHandlerConfiguredRef.current = true;
                }
                Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
                if (!configuredRef.current) {
                    Purchases.configure({ apiKey: revenueCatConfig.getApiKey(), appUserID: userId });
                    configuredRef.current = true;
                    configuredUserRef.current = userId;
                } else if (configuredUserRef.current !== userId) {
                    await Purchases.logIn(userId);
                    configuredUserRef.current = userId;
                }

                await refresh();
            } catch (error) {
                console.warn('RevenueCat configure error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        configure();

        if (!listenerAddedRef.current) {
            listenerAddedRef.current = true;
            Purchases.addCustomerInfoUpdateListener((info) => {
                applyCustomerInfo(info).catch((error) => {
                    console.warn('RevenueCat listener error:', error);
                });
            });
        }
    }, [applyCustomerInfo, refresh, userState.user?.uid]);

    const presentPaywall = useCallback(async () => {
        try {
            const result = await PurchasesUI.presentPaywall({ displayCloseButton: true });
            if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
                await refresh();
            }
        } catch (error) {
            console.warn('RevenueCat paywall error:', error);
            Alert.alert(t('paywall.errorTitlePurchase'), t('paywall.errorPurchase'));
        }
    }, [refresh, t]);

    const presentPaywallIfNeeded = useCallback(async () => {
        try {
            const result = await PurchasesUI.presentPaywallIfNeeded({
                requiredEntitlementIdentifier: revenueCatConfig.entitlementId,
                displayCloseButton: true,
            });
            if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
                await refresh();
            }
        } catch (error) {
            console.warn('RevenueCat paywall-if-needed error:', error);
            Alert.alert(t('paywall.errorTitlePurchase'), t('paywall.errorPurchase'));
        }
    }, [refresh, t]);

    const restorePurchases = useCallback(async () => {
        try {
            const info = await Purchases.restorePurchases();
            await applyCustomerInfo(info);
        } catch (error) {
            console.warn('RevenueCat restore error:', error);
            Alert.alert(t('paywall.restoreErrorTitle'), t('paywall.restoreErrorMessage'));
        }
    }, [applyCustomerInfo, t]);

    const openCustomerCenter = useCallback(async () => {
        try {
            await PurchasesUI.presentCustomerCenter();
        } catch (error) {
            console.warn('RevenueCat customer center error:', error);
        }
    }, []);

    return (
        <PremiumContext.Provider
            value={{
                isPremium,
                isLoading,
                customerInfo,
                refresh,
                presentPaywall,
                presentPaywallIfNeeded,
                restorePurchases,
                openCustomerCenter,
            }}
        >
            {children}
        </PremiumContext.Provider>
    );
}

export function usePremium() {
    const context = useContext(PremiumContext);
    if (!context) {
        throw new Error('usePremium must be used within PremiumProvider');
    }
    return context;
}
