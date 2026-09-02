import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  // Navigation & General
  welcome: string;
  verifiedProducer: string;
  fpoHub: string;
  listHarvest: string;
  listHarvestSub: string;
  mandiIntelligence: string;
  mandiIntelligenceSub: string;
  
  // KPIs
  activeHarvestListed: string;
  pendingBuyerOffers: string;
  ordersInTransit: string;
  totalPayoutsReleased: string;
  zeroMiddleman: string;
  safePaymentProtected: string;
  
  // AI Hero
  aiMarketAdvisory: string;
  suggestedPriceToday: string;
  optimalSellingWindow: string;
  demandHigh: string;
  demandMedium: string;
  demandLow: string;
  demandHighAdvice: string;
  demandMediumAdvice: string;
  demandLowAdvice: string;
  
  // Produce Table
  myListedProduce: string;
  addCrop: string;
  cropDetails: string;
  availableQty: string;
  askingPrice: string;
  demand: string;
  status: string;
  noProduceListed: string;
  
  // Offers
  directBuyerOffers: string;
  viewAllOffers: string;
  noBuyerOffers: string;
  acceptAndLock: string;
  decline: string;
  offerFrom: string;
  
  // Escrow plain explanation
  escrowExplanation: string;
}

const translations: Record<Language, Translations> = {
  en: {
    welcome: 'Welcome',
    verifiedProducer: 'Verified Producer',
    fpoHub: 'FPO Collective Hub',
    listHarvest: 'List My Harvest',
    listHarvestSub: 'Sell directly to verified buyers with zero middleman deductions',
    mandiIntelligence: 'Live Mandi Prices',
    mandiIntelligenceSub: 'See today\'s market rates across major wholesale mandis',
    
    activeHarvestListed: 'My Listed Crops',
    pendingBuyerOffers: 'Buyer Offers Waiting',
    ordersInTransit: 'Dispatches On The Way',
    totalPayoutsReleased: 'Money Coming To Me',
    zeroMiddleman: '0% Middleman Deduction',
    safePaymentProtected: 'Protected by Guaranteed Safe Payment',
    
    aiMarketAdvisory: 'Today\'s Market Price & Selling Advice',
    suggestedPriceToday: 'Suggested Price Today',
    optimalSellingWindow: 'Optimal Window: Next 48 Hours',
    demandHigh: 'High Demand',
    demandMedium: 'Moderate Demand',
    demandLow: 'Low Demand',
    demandHighAdvice: 'Buyers in your region need this crop now. Good time to sell for top price.',
    demandMediumAdvice: 'Market prices are steady. Good time to list standard harvest lots.',
    demandLowAdvice: 'Market supply is high. Consider staggering harvest or target nearby bulk buyers.',
    
    myListedProduce: 'My Active Harvest Batches',
    addCrop: '+ Add Crop',
    cropDetails: 'Crop Name',
    availableQty: 'Available Qty',
    askingPrice: 'Your Price',
    demand: 'Demand',
    status: 'Status',
    noProduceListed: 'No crop batches listed yet. Tap "+ List My Harvest" above to get started.',
    
    directBuyerOffers: 'Direct Buyer Offers',
    viewAllOffers: 'View All',
    noBuyerOffers: 'No buyer offers waiting right now. Buyers will send offers when your crop is listed.',
    acceptAndLock: 'Accept & Lock Safe Payment',
    decline: 'Decline Offer',
    offerFrom: 'Offer from',
    
    escrowExplanation: 'Guaranteed Safe Payment: Money is held securely by VAYORA until the buyer inspects and receives your harvest, then released directly to your bank.',
  },
  hi: {
    welcome: 'नमस्ते',
    verifiedProducer: 'प्रमाणित किसान (उत्पादक)',
    fpoHub: 'FPO सामूहिक केंद्र',
    listHarvest: 'अपनी फसल बेचें (सूचीबद्ध करें)',
    listHarvestSub: 'बिना किसी बिचौलिए के सीधे सत्यापित खरीदारों को बेचें',
    mandiIntelligence: 'आज के मंडी भाव',
    mandiIntelligenceSub: 'प्रमुख थोक मंडियों के आज के भाव देखें',
    
    activeHarvestListed: 'मेरी दर्ज फसलें',
    pendingBuyerOffers: 'खरीदारों के नए प्रस्ताव',
    ordersInTransit: 'रास्ते में जा रहा माल',
    totalPayoutsReleased: 'मेरी कुल कमाई',
    zeroMiddleman: '0% दलाली कटौती',
    safePaymentProtected: 'सुरक्षित भुगतान गारंटी द्वारा संरक्षित',
    
    aiMarketAdvisory: 'आज का बाजार भाव और सलाह',
    suggestedPriceToday: 'आज का सुझाया गया भाव',
    optimalSellingWindow: 'उपयुक्त समय: अगले 48 घंटे',
    demandHigh: 'उच्च मांग (High Demand)',
    demandMedium: 'मध्यम मांग (Medium Demand)',
    demandLow: 'कम मांग (Low Demand)',
    demandHighAdvice: 'आपके क्षेत्र में खरीदारों की भारी मांग है। फसल बेचने का सर्वोत्तम समय है।',
    demandMediumAdvice: 'बाजार भाव स्थिर हैं। मानक फसल बैच बेचने के लिए अच्छा समय है।',
    demandLowAdvice: 'बाजार में माल अधिक है। नजदीकी थोक खरीदारों को प्राथमिकता दें।',
    
    myListedProduce: 'मेरी सक्रिय फसलें',
    addCrop: '+ फसल जोड़ें',
    cropDetails: 'फसल का नाम',
    availableQty: 'उपलब्ध मात्रा',
    askingPrice: 'आपका भाव',
    demand: 'मांग',
    status: 'स्थिति',
    noProduceListed: 'अभी कोई फसल दर्ज नहीं है। अपनी फसल बेचने के लिए ऊपर "+ अपनी फसल बेचें" दबाएं।',
    
    directBuyerOffers: 'खरीदारों के सीधे प्रस्ताव',
    viewAllOffers: 'सभी देखें',
    noBuyerOffers: 'वर्तमान में कोई नया प्रस्ताव नहीं है। फसल दर्ज करने पर खरीदार प्रस्ताव भेजेंगे।',
    acceptAndLock: 'स्वीकार करें और भुगतान सुरक्षित करें',
    decline: 'अस्वीकार करें',
    offerFrom: 'खरीदार:',
    
    escrowExplanation: 'सुरक्षित भुगतान गारंटी: खरीदार द्वारा फसल प्राप्त और सत्यापित करने तक पैसा सुरक्षित रहता है और तुरंत आपके बैंक खाते में भेजा जाता है।',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: translations.en,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('vayora_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vayora_language', lang);
  };

  const value = {
    language,
    setLanguage,
    t: translations[language] || translations.en,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
