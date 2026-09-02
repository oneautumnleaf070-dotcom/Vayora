// VAYORA i18n scaffold (Task 5)
//
// English is the only locale shipped today. This file exists so that adding
// Hindi / regional languages later is a data change, not a rewrite: add a new
// top-level key to `dictionaries` with the same string keys translated, then
// LocaleContext's setLocale() switches the whole app.
//
// Keep keys flat and farmer/FPO-facing copy in plain, jargon-free language —
// that's the whole point of this scaffold (Task 5: make VAYORA legible to
// small-holder farmers who may not read English or agri-fintech terms fluently).

export type Locale = 'en';

export interface StringDictionary {
  farmer_greeting: string;
  farmer_role_badge_farmer: string;
  farmer_role_badge_fpo: string;
  farmer_hero_cta_title: string;
  farmer_hero_cta_body: string;
  farmer_hero_cta_body_fpo: string;
  farmer_hero_cta_button: string;
  farmer_kpi_harvest_title: string;
  farmer_kpi_offers_title: string;
  farmer_kpi_orders_title: string;
  farmer_kpi_orders_subtitle: string;
  farmer_kpi_payouts_title: string;
  farmer_kpi_payouts_subtitle: string;
  farmer_ai_section_title: string;
  farmer_ai_summary_loading: string;
  farmer_ai_summary_template: string; // {crop}, {min}, {max}, {demand}
  farmer_ai_demand_high: string;
  farmer_ai_demand_medium: string;
  farmer_ai_demand_low: string;
  farmer_inventory_title: string;
  farmer_inventory_empty: string;
  farmer_offers_title: string;
  farmer_offers_empty: string;
  farmer_offer_accept: string;
  farmer_offer_decline: string;
  farmer_money_coming_label: string;
}

const en: StringDictionary = {
  farmer_greeting: 'Welcome, {name}',
  farmer_role_badge_farmer: 'Verified Producer',
  farmer_role_badge_fpo: 'FPO Collective Hub',
  farmer_hero_cta_title: 'Ready to sell?',
  farmer_hero_cta_body: 'Add your harvest in a few easy steps. Buyers see it right away.',
  farmer_hero_cta_body_fpo: "Add your collective's harvest in a few easy steps. Buyers see it right away.",
  farmer_hero_cta_button: '+ List My Harvest',
  farmer_kpi_harvest_title: 'Harvest Listed',
  farmer_kpi_offers_title: 'Offers Waiting For You',
  farmer_kpi_orders_title: 'Orders On The Way',
  farmer_kpi_orders_subtitle: 'Your money is protected until delivery',
  farmer_kpi_payouts_title: 'Money Received So Far',
  farmer_kpi_payouts_subtitle: 'No middleman cut, ever',
  farmer_ai_section_title: "Today's Fair Price Guide",
  farmer_ai_summary_loading: 'Checking today’s market prices for you…',
  farmer_ai_summary_template: "Suggested price for {crop}: ₹{min}–₹{max} per kg. Demand is {demand} right now.",
  farmer_ai_demand_high: 'high — a good time to sell',
  farmer_ai_demand_medium: 'steady',
  farmer_ai_demand_low: 'low — you may want to wait a few days',
  farmer_inventory_title: 'My Harvest',
  farmer_inventory_empty: 'You haven’t listed any harvest yet. Tap "List My Harvest" above to get started.',
  farmer_offers_title: 'Offers From Buyers',
  farmer_offers_empty: 'No offers yet. Buyers will contact you once your harvest is listed.',
  farmer_offer_accept: 'Accept — Money Held Safely',
  farmer_offer_decline: 'Not Now',
  farmer_money_coming_label: 'Money coming to you',
};

const dictionaries: Record<Locale, StringDictionary> = { en };

export function getDictionary(locale: Locale): StringDictionary {
  return dictionaries[locale] || dictionaries.en;
}
