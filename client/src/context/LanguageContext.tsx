import { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { PHRASES, WORDS, PHRASES_AR, WORDS_AR } from '../i18n/dict';

export type Language = 'en' | 'fr' | 'ar';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (english: string) => string;
}

const LANGUAGE_KEY = 'shopora.language';

/* Legacy phrase entries kept for backward compatibility with the nav labels and other inline usage (French). */
const LEGACY_PHRASES: Record<string, string> = {
  Orders: 'Commandes', Returns: 'Retours', Exchanges: 'Échanges', 'New order': 'Nouvelle commande',
  Dashboard: 'Tableau de bord', Products: 'Produits', Support: 'Assistance', Chat: 'Discussion',
  Settings: 'Paramètres', Order: 'Commande', Exchange: 'Échange', Return: 'Retour', Returned: 'Retourné',
  Created: 'Créée', Sent: 'Envoyée', Confirmed: 'Confirmée', Preparing: 'En préparation',
  Shipped: 'Expédiée', Delivered: 'Livrée', Cancelled: 'Annulée', Yes: 'Oui', No: 'Non',
  Summary: 'Résumé', Client: 'Client', Destination: 'Destination', Articles: 'Articles', Fragile: 'Fragile',
  Price: 'Prix', Search: 'Rechercher', Filters: 'Filtres', Refresh: 'Actualiser', Cancel: 'Annuler',
  Save: 'Enregistrer', Submit: 'Envoyer', Close: 'Fermer', Delete: 'Supprimer', Edit: 'Modifier',
  Status: 'Statut', Description: 'Description', Quantity: 'Quantité', Supplier: 'Fournisseur',
  Suppliers: 'Fournisseurs', Customer: 'Client', Loading: 'Chargement', Scheduled: 'Planifiée',
  Today: 'Aujourd’hui', Answered: 'Répondue', Tickets: 'Tickets', Assignees: 'Assignés',
  Priority: 'Priorité', Title: 'Titre', Create: 'Créer', Payouts: 'Paiements',
  Shipments: 'Expéditions', Revenue: 'Revenus', Expenses: 'Dépenses', Pending: 'En attente',
  Paid: 'Payé', Unpaid: 'Impayé', Phone: 'Téléphone', Address: 'Adresse', City: 'Ville',
};

/* Legacy phrase entries (Arabic) for the same UI labels. */
const LEGACY_PHRASES_AR: Record<string, string> = {
  Orders: 'الطلبات', Returns: 'المرتجعات', Exchanges: 'الاستبدالات', 'New order': 'طلب جديد',
  Dashboard: 'لوحة التحكم', Products: 'المنتجات', Support: 'الدعم', Chat: 'المحادثة',
  Settings: 'الإعدادات', Order: 'الطلب', Exchange: 'استبدال', Return: 'إرجاع', Returned: 'مرتجع',
  Created: 'أنشئت', Sent: 'مرسلة', Confirmed: 'مؤكدة', Preparing: 'قيد التجهيز',
  Shipped: 'تم شحنها', Delivered: 'تم تسليمها', Cancelled: 'ملغاة', Yes: 'نعم', No: 'لا',
  Summary: 'ملخص', Client: 'العميل', Destination: 'الوجهة', Articles: 'الأصناف', Fragile: 'هش',
  Price: 'السعر', Search: 'بحث', Filters: 'عوامل التصفية', Refresh: 'تحديث', Cancel: 'إلغاء',
  Save: 'حفظ', Submit: 'إرسال', Close: 'إغلاق', Delete: 'حذف', Edit: 'تعديل',
  Status: 'الحالة', Description: 'الوصف', Quantity: 'الكمية', Supplier: 'المورد',
  Suppliers: 'الموردون', Customer: 'العميل', Loading: 'جارٍ التحميل', Scheduled: 'مجدولة',
  Today: 'اليوم', Answered: 'تمت الإجابة', Tickets: 'التذاكر', Assignees: 'المسند إليهم',
  Priority: 'الأولوية', Title: 'العنوان', Create: 'إنشاء', Payouts: 'التسويات',
  Shipments: 'الشحنات', Revenue: 'الإيرادات', Expenses: 'المصاريف', Pending: 'معلق',
  Paid: 'مدفوع', Unpaid: 'غير مدفوع', Phone: 'الهاتف', Address: 'العنوان', City: 'المدينة',
  Organization: 'المنظمة', 'Account manager': 'مدير الحساب',
};

interface LangDicts {
  phrases: Record<string, string>;
  words: Record<string, string>;
}

export const DICTS: Record<'fr' | 'ar', LangDicts> = {
  fr: { phrases: { ...LEGACY_PHRASES, ...PHRASES }, words: WORDS },
  ar: { phrases: { ...LEGACY_PHRASES_AR, ...PHRASES_AR }, words: WORDS_AR },
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildEngine(dicts: LangDicts) {
  const rePhrases = Object.keys(dicts.phrases)
    .sort((a, b) => b.length - a.length)
    .map((key) => ({ re: new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi'), to: dicts.phrases[key] }));
  const reWords = Object.keys(dicts.words)
    .sort((a, b) => b.length - a.length)
    .map((word) => escapeRegExp(word))
    .join('|');
  return {
    rePhrases,
    wordPattern: new RegExp(`\\b(${reWords})\\b`, 'gi'),
    words: dicts.words,
  };
}

const ENGINES: Record<'fr' | 'ar', ReturnType<typeof buildEngine>> = {
  fr: buildEngine(DICTS.fr),
  ar: buildEngine(DICTS.ar),
};

function capLike(source: string, replacement: string): string {
  if (!source) return replacement;
  const first = source.charAt(0);
  if (first === first.toUpperCase() && first.toLowerCase() !== first) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function translate(value: string, language: Language): string {
  if (language === 'en') return value;
  if (!value || /^\s*$/.test(value)) return value;
  const engine = ENGINES[language];
  let out = value;
  for (const { re, to } of engine.rePhrases) {
    out = out.replace(re, (match) => capLike(match, to));
  }
  out = out.replace(engine.wordPattern, (match, key: string) => {
    const target = engine.words[key.toLowerCase()];
    return target ? capLike(match, target) : match;
  });
  return out;
}

/* Keeps the original English text of every translated node/attribute so that
   toggling the language never corrupts the DOM (always re-derives from the original). */
const originals = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<HTMLElement, Record<string, string>>();

function isPdfSurface(el: Element | null): boolean {
  let current: Element | null = el;
  while (current) {
    const cls = typeof current.className === 'string' ? current.className : '';
    if (/\bprint:(bg-white|p-0|m-0|shadow-none)\b/.test(cls) || /\bpdf\b/i.test(cls)) return true;
    current = current.parentElement;
  }
  return false;
}

function isSkipped(node: Node): boolean {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  if (!el) return true;
  if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) return true;
  if (el.closest('code, pre, kbd, svg, [data-no-translate]')) return true;
  if (isPdfSurface(el)) return true;
  return false;
}

function translateTextNode(node: Text, language: Language): void {
  if (isSkipped(node)) return;
  let original = originals.get(node);
  if (original === undefined) {
    original = node.nodeValue ?? '';
    originals.set(node, original);
  }
  const next = translate(original, language);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateAttributes(root: Element, language: Language): void {
  const list = root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label], [alt]');
  for (const element of Array.from(list)) {
    if (isSkipped(element)) continue;
    let stored = originalAttrs.get(element);
    if (!stored) {
      stored = {};
      originalAttrs.set(element, stored);
    }
    for (const attribute of ['placeholder', 'title', 'aria-label', 'alt'] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const original = stored[attribute] ?? value;
      stored[attribute] = original;
      const next = translate(original, language);
      if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
    }
  }
}

function translateTree(root: Node, language: Language): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language);
    return;
  }
  if (!(root instanceof Element)) return;
  if (isSkipped(root)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) translateTextNode(current as Text, language);

  translateAttributes(root, language);
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (value) => value,
});

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === 'fr' || saved === 'ar' ? saved : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  /* The DOM always renders English (including t() labels); this walker is the
     single source of foreign languages. Running before paint avoids a flash. */
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    translateTree(document.body, language);
  }, [language]);

  useEffect(() => {
    if (language === 'en') return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) translateTree(node, language);
        if (record.type === 'characterData' && record.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(record.target as Text, language);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'] });
    return () => observer.disconnect();
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* ignore storage errors */
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: (value) => value }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}