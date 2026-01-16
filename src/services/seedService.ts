import { addTransaction } from "./transactionService";
import { createGoal } from "./goalsService";
import { addInvestment } from "./investmentsService";

export const seedDemoData = async () => {
    try {
        // 1. Trigger High Spending Alert (Threshold > 50,000)
        await addTransaction({
            amount: 55000,
            category: "Shopping",
            description: "Luxury Watch (Demo)",
            createdAt: new Date()
        });

        // 2. Trigger Goal Completion Alert
        await createGoal({
            name: "Vacation Fund (Demo)",
            target: 20000,
            current: 20000,
            deadline: "2024-12-31",
            status: "Reached"
        });

        // 3. Trigger Investment Drop Alert (Change < -5%)
        await addInvestment({
            name: "Volatile Tech Stock (Demo)",
            type: "Stock",
            invested: 10000,
            current: 8500,
            change: -15.0, // 15% drop
            date: new Date()
        });

        console.log("Seed data added successfully");
        return true;
    } catch (error) {
        console.error("Error seeding data:", error);
        return false;
    }
};
