export const insertRecords = async (connectionQueryInterface, table, data, ignoreDuplicates = true, updateOnDuplicate = undefined) => {
    const db = connectionQueryInterface;

    const res = await db.bulkInsert(table, data, {
        ignoreDuplicates,
        updateOnDuplicate,
    });
    return res;
}