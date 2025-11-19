import { formatToMySQLDateTime } from "./mysql-datetime-formartter.js";

export const getDataFromSource = async (connectionQueryInterface, table, connectionType = 'mysql', query = null) => {
    // get data
    const db = connectionQueryInterface;
    let data = await db.select(null, table);



    if (connectionType === 'mysql') {
        // Get table column definitions to identify datetime columns
        const tableDescription = await db.describeTable(table);
        // Get DATETIME columns
        const datetimeColumns = Object.keys(tableDescription).filter(
            col => ['DATETIME', 'TIMESTAMP'].includes(tableDescription[col].type)
        );
        // Process for mysql DATETIME and TIMESTAMP columns
        const processedUsers = data.map(d => {
            const newUser = { ...d };
            for (const col of datetimeColumns) {
                if (newUser[col]) {
                    newUser[col] = formatToMySQLDateTime(newUser[col]);
                }
            };
            return newUser;
        });
        data = processedUsers;
    }
    return data;
}