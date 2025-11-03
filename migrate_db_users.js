import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { conn } from './config/db.js'

const app = express()
app.use(cors())

const port = 3501

try {
    conn.authenticate()
    console.log('Connection has been established successfully.')
} catch (error) {
    console.error('Unable to connect to the database:', error)
    process.exit(1)
}

const db = sequelize.getQueryInterface();
const users = await db.select(null, 'admin_settings')
// console.log(users)
const formatToMySQLDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

// Get table column definitions to identify datetime columns
const tableDescription = await db.describeTable('admin_settings');
const datetimeColumns = Object.keys(tableDescription).filter(
    col => ['DATETIME', 'TIMESTAMP'].includes(tableDescription[col].type)
);

// Process the data
const processedUsers = users.map(user => {
    const newUser = { ...user };
    datetimeColumns.forEach(col => {
        if (newUser[col]) {
            newUser[col] = formatToMySQLDateTime(newUser[col]);
        }
    });
    return newUser;
});

// Now you can use processedUsers for bulk insert
// For Laravel equivalent (assuming you're moving this data to Laravel)
const laravelInsertFormat = processedUsers.map(user => ({
    ...user,
    // Add created_at/updated_at if needed
    created_at: formatToMySQLDateTime(new Date()),
    updated_at: formatToMySQLDateTime(new Date())
}));
// console.log(laravelInsertFormat)

const response = await axios.post(
    'http://44.220.0.33:8001/api/v1/insert/settings',
    laravelInsertFormat,
    {
        headers: {
            'Content-Type': 'application/json',
        },
    }
)
console.log("server response: ", response)
app.listen(port)