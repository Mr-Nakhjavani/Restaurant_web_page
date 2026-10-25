import type { MenuItemDef } from "@/domain/types";
import { breakfastItems, starterItems } from "./breakfast-starters";
import { traditionalItems, riceItems } from "./traditional-rice";
import { grillItems, vegetarianItems } from "./grills-vegetarian";
import { dessertItems, hotDrinkItems, coldDrinkItems } from "./desserts-drinks";
import { familyItems, occasionItems } from "./family-occasions";

export { menuCategories } from "./categories";

/** The complete canonical menu (46 items), in category order. */
export const menuItems: MenuItemDef[] = [
  ...breakfastItems,
  ...starterItems,
  ...traditionalItems,
  ...riceItems,
  ...grillItems,
  ...vegetarianItems,
  ...dessertItems,
  ...hotDrinkItems,
  ...coldDrinkItems,
  ...familyItems,
  ...occasionItems,
];
