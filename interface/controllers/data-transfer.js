import { insertRecords } from "../utils/database/insert-into-destination-db.js";

export class DataTransfer {
    constructor(dbConnectionDI) {
        this.dbConnectionDI = dbConnectionDI;
    }

    async fromBCAPIToDB(dbConfig, options, transportUtil, transportUtilType = 'hypernexus') {
        try {
            if (!dbConfig || !options.db.tables) throw new Error('Missing destination database configurations');
            let response;
            const tType = transportUtilType?.toUpperCase();
            switch (tType) {
                case 'HYPERNEXUS': {
                    response = await this.readBCAPIDataWithHyperNexus(transportUtil, options.bc.endpoint, options.bc.query ?? {}, options.bc.transportOptions);
                }
            }

            let iRecords;
            if (response.value) {
                const dbConn = this.dbConnectionDI(options.db.connector, options.db.connectorType ?? 'sequelize', dbConfig, 'destination');

                iRecords = await Promise.all(
                    options.db.tables.map((t) => insertRecords(dbConn.getQueryInterface(), t.name, t.prepareData(response.value))),
                );

            }
            const nextLink = response['@odata.nextLink'];
            console.log(nextLink);
            if (nextLink) {
                const url = new URL(nextLink);
                const searchParams = {};
                for (const [key, value] of url.searchParams.entries()) {
                    searchParams[key] = value;
                }
                options.bc.query = searchParams;
                setTimeout(async () => await this.fromBCAPIToDB(dbConfig, options, transportUtil, transportUtilType), 3000);

            }

        } catch (error) {
            console.error(`[DATA TRANSFER ERROR: FROM BC TO DB]:`, error)
        }
    }

    async readBCAPIDataWithHyperNexus(transportUtil, endpoint, query = {}, transportOptions = {}) {
        try {
            return await transportUtil.get(endpoint, query, transportOptions);
        } catch (error) {
            console.error(`[DATA TRANSFERE READ BC DATA WITH HYPERNEXUS]:`, error);
        }
    }
}