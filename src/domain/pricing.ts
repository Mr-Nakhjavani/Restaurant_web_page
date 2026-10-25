import type { Catalog, CatalogItem } from "./catalog";
import { composeItem, defaultOptionIds, findOption } from "./catalog";
import type { ModifierOption } from "./types";

export interface LineInput {
  itemId: string;
  quantity: number;
  /** Selected option ids. Omitted groups fall back to their defaults. */
  options?: string[];
  notes?: string;
}

export interface LineIssue {
  code: "UNKNOWN_MENU_ITEM" | "INVALID_CUSTOMIZATION" | "INVALID_QUANTITY";
  message: string;
  lineIndex: number;
  itemId: string;
  details?: Record<string, unknown>;
}

export interface PricedLine {
  lineIndex: number;
  itemId: string;
  item: CatalogItem;
  name: string;
  quantity: number;
  selectedOptionIds: string[];
  selectedOptions: { groupId: string; groupName: string; optionId: string; name: string; priceDeltaFils: number }[];
  unitBasePriceFils: number;
  unitOptionsFils: number;
  unitPriceFils: number;
  lineTotalFils: number;
  kitchenPortions: number;
  notes: string | null;
}

/**
 * Resolve the full option selection for a line: explicit choices override the
 * group's defaults; validation enforces single/multiple and min/max rules.
 */
export function resolveSelection(item: CatalogItem, requested: string[] | undefined): { selection: string[]; error?: string } {
  const chosen = new Set(requested ?? []);
  for (const id of chosen) {
    if (!findOption(item, id)) {
      return { selection: [], error: `“${id}” is not a valid option for ${item.name}.` };
    }
  }
  const selection: string[] = [];
  for (const group of item.customizations) {
    const picked = group.options.filter((o) => chosen.has(o.id)).map((o) => o.id);
    const effective = picked.length > 0 ? picked : requested === undefined || group.selection === "single" ? group.options.filter((o) => o.default).map((o) => o.id) : [];
    if (group.selection === "single" && effective.length > 1) {
      return { selection: [], error: `Choose only one option for “${group.name}” on ${item.name}.` };
    }
    if (effective.length < group.min) {
      return { selection: [], error: `“${group.name}” requires at least ${group.min} choice(s) for ${item.name}.` };
    }
    if (effective.length > group.max) {
      return { selection: [], error: `“${group.name}” allows at most ${group.max} choice(s) for ${item.name}.` };
    }
    selection.push(...effective);
  }
  return { selection };
}

export function priceLines(
  catalog: Catalog,
  lines: LineInput[],
  limits: { maxQuantityPerLine: number; bulk?: boolean },
): { priced: PricedLine[]; issues: LineIssue[] } {
  const priced: PricedLine[] = [];
  const issues: LineIssue[] = [];
  lines.forEach((line, lineIndex) => {
    const item = catalog.itemsById.get(line.itemId) ?? catalog.itemsBySlug.get(line.itemId);
    if (!item) {
      issues.push({ code: "UNKNOWN_MENU_ITEM", message: `No menu item with id “${line.itemId}”.`, lineIndex, itemId: line.itemId });
      return;
    }
    // Bulk quotes accept large quantities here; catering limits are reported as feasibility issues.
    const maxQty = limits.bulk
      ? limits.maxQuantityPerLine
      : Math.min(item.maxPerOrder, item.bulk.bulkOnly ? item.maxPerOrder : limits.maxQuantityPerLine);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > maxQty) {
      issues.push({
        code: "INVALID_QUANTITY",
        message: `Quantity for ${item.name} must be a whole number between 1 and ${maxQty}.`,
        lineIndex,
        itemId: item.id,
        details: { min: 1, max: maxQty, requested: line.quantity },
      });
      return;
    }
    const { selection, error } = resolveSelection(item, line.options);
    if (error) {
      issues.push({
        code: "INVALID_CUSTOMIZATION",
        message: error,
        lineIndex,
        itemId: item.id,
        details: {
          availableOptions: item.customizations.map((g) => ({
            groupId: g.id,
            groupName: g.name,
            selection: g.selection,
            required: g.required,
            options: g.options.map((o) => ({ id: o.id, name: o.name, priceDeltaFils: o.priceDeltaFils })),
          })),
        },
      });
      return;
    }
    const selectedOptions = selection.map((id) => {
      const found = findOption(item, id)!;
      return { groupId: found.group.id, groupName: found.group.name, optionId: id, name: found.option.name, priceDeltaFils: found.option.priceDeltaFils };
    });
    const unitOptionsFils = selectedOptions.reduce((sum, o) => sum + o.priceDeltaFils, 0);
    const unitPriceFils = Math.max(0, item.priceFils + unitOptionsFils);
    priced.push({
      lineIndex,
      itemId: item.id,
      item,
      name: item.name,
      quantity: line.quantity,
      selectedOptionIds: selection,
      selectedOptions,
      unitBasePriceFils: item.priceFils,
      unitOptionsFils,
      unitPriceFils,
      lineTotalFils: unitPriceFils * line.quantity,
      kitchenPortions: item.kitchenPortions * line.quantity,
      notes: line.notes?.trim() || null,
    });
  });
  return { priced, issues };
}

/** Allergens of a priced line as customised (used on order summaries and kitchen tickets). */
export function lineAllergens(catalog: Catalog, line: PricedLine) {
  return composeItem(catalog, line.item, line.selectedOptionIds).allergens;
}

export function optionSummary(options: ModifierOption[]): string {
  return options.map((o) => o.name).join(", ");
}

export { defaultOptionIds };
