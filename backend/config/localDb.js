import { JSONFilePreset } from 'lowdb/node';

// Define default data
const defaultData = {
    users: [],
    transactions: [],
    settings: [],
    aiLogs: []
};

// Initialize the database asynchronously
let db;

export const initDB = async () => {
    db = await JSONFilePreset('proxfox_local_db.json', defaultData);
    console.log('Local JSON Database initialized.');
    return db;
};

export const getDB = () => {
    if (!db) {
        throw new Error("Database not initialized. Ensure initDB is called first.");
    }
    return db;
};
