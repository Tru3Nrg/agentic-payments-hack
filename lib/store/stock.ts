import fs from "fs";
import path from "path";
import { STORE_ITEMS } from "./items";

const STOCK_FILE = path.join(process.cwd(), "data", "store-stock.json");

export interface StockRecord {
    [itemId: string]: number;
}

// Initialize stock file with default values (10 for each item, skip bundles)
function initializeStock(): StockRecord {
    const stock: StockRecord = {};
    STORE_ITEMS.forEach(item => {
        // Bundles don't have their own stock, they use component items' stock
        if (!item.isBundle) {
            stock[item.id] = 10;
        }
    });
    return stock;
}

// Get current stock
export function getStock(): StockRecord {
    const stockDir = path.dirname(STOCK_FILE);
    if (!fs.existsSync(stockDir)) {
        fs.mkdirSync(stockDir, { recursive: true });
    }

    if (!fs.existsSync(STOCK_FILE)) {
        const initialStock = initializeStock();
        fs.writeFileSync(STOCK_FILE, JSON.stringify(initialStock, null, 2));
        return initialStock;
    }

    try {
        const data = fs.readFileSync(STOCK_FILE, "utf-8");
        const stock = JSON.parse(data);

        // Ensure all items have stock (in case new items were added)
        let updated = false;
        STORE_ITEMS.forEach(item => {
            if (stock[item.id] === undefined) {
                stock[item.id] = 10;
                updated = true;
            }
        });

        if (updated) {
            fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2));
        }

        return stock;
    } catch (e) {
        // If file is corrupted, reinitialize
        const initialStock = initializeStock();
        fs.writeFileSync(STOCK_FILE, JSON.stringify(initialStock, null, 2));
        return initialStock;
    }
}

// Get stock for a specific item
export function getItemStock(itemId: string): number {
    const stock = getStock();
    return stock[itemId] ?? 10; // Default to 10 if not found
}

// Decrement stock for an item (returns new stock count)
export function decrementStock(itemId: string): number {
    const stock = getStock();

    if (stock[itemId] === undefined) {
        stock[itemId] = 10;
    }

    if (stock[itemId] > 0) {
        stock[itemId]--;
        fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2));
    }

    return stock[itemId];
}

// Check if item is in stock
export function isInStock(itemId: string): boolean {
    return getItemStock(itemId) > 0;
}

// Check if bundle items are in stock
export function isBundleInStock(bundleItemIds: string[]): boolean {
    return bundleItemIds.every(itemId => isInStock(itemId));
}

// Decrement stock for bundle items (returns minimum remaining stock)
export function decrementBundleStock(bundleItemIds: string[]): number {
    let minStock = Infinity;
    bundleItemIds.forEach(itemId => {
        const remaining = decrementStock(itemId);
        if (remaining < minStock) {
            minStock = remaining;
        }
    });
    return minStock;
}

// Reset stock (useful for testing or restocking)
export function resetStock(itemId?: string): StockRecord {
    const stock = getStock();

    if (itemId) {
        stock[itemId] = 10;
    } else {
        // Reset all items
        STORE_ITEMS.forEach(item => {
            stock[item.id] = 10;
        });
    }

    fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2));
    return stock;
}

