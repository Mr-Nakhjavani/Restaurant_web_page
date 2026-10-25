import type { MenuCategoryDef } from "@/domain/types";

export const menuCategories: MenuCategoryDef[] = [
  { id: "cat_breakfast", slug: "emirati-breakfast", name: "Emirati Breakfast", arabicName: "الفطور الإماراتي", description: "Served daily from 08:00 to 11:30 (not during Ramadan). The weekend breakfast spread is served on Saturdays and Sundays until 12:00.", sortOrder: 1 },
  { id: "cat_starters", slug: "starters-and-mezze", name: "Starters & Mezze", arabicName: "المقبلات", description: "Small plates to share, from lentil shorba to sambousa and mehyawa regag.", sortOrder: 2 },
  { id: "cat_traditional", slug: "traditional-emirati", name: "Traditional Emirati", arabicName: "أطباق تقليدية", description: "Home-style stews and slow-cooked classics, including our weekday specials.", sortOrder: 3 },
  { id: "cat_rice", slug: "rice-and-machboos", name: "Rice & Machboos", arabicName: "المجبوس والأرز", description: "Machboos and muhammar — spiced and sweet rice dishes at the heart of the Emirati table.", sortOrder: 4 },
  { id: "cat_grills", slug: "grills-and-seafood", name: "Grills & Seafood", arabicName: "المشاوي والبحريات", description: "Charcoal grills, Gulf seafood and contemporary camel dishes.", sortOrder: 5 },
  { id: "cat_vegetarian", slug: "vegetarian", name: "Vegetarian", arabicName: "أطباق نباتية", description: "Plant-based saloona and machboos. All three dishes are vegan.", sortOrder: 6 },
  { id: "cat_desserts", slug: "desserts", name: "Desserts", arabicName: "الحلويات", description: "Luqaimat, khanfaroosh and seasonal sweets.", sortOrder: 7 },
  { id: "cat_hot_drinks", slug: "gahwa-and-hot-drinks", name: "Gahwa & Hot Drinks", arabicName: "القهوة والمشروبات الساخنة", description: "Emirati coffee poured from the dallah, karak and sulaimani.", sortOrder: 8 },
  { id: "cat_cold_drinks", slug: "cold-drinks", name: "Cold Drinks", arabicName: "المشروبات الباردة", description: "Laban, fresh lemon-mint and date shakes. We are an alcohol-free restaurant.", sortOrder: 9 },
  { id: "cat_family", slug: "family-platters-and-catering", name: "Family Platters & Catering", arabicName: "الصواني العائلية والولائم", description: "Sharing platters for the majlis, the Friday family platter, whole lamb ouzi and office lunch boxes.", sortOrder: 10 },
  { id: "cat_occasions", slug: "seasonal-and-occasions", name: "Seasonal & Occasions", arabicName: "المواسم والمناسبات", description: "Menus served only during Ramadan and UAE National Day (Eid Al Etihad).", sortOrder: 11 },
];
