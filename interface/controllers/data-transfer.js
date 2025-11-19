import { createTunnel } from "tunnel-ssh";
import { insertRecords } from "../utils/database/insert-into-destination-db.js";
import { createSSHTunnel } from "../utils/ssh/create-ssh-tunnel.js";

export class DataTransfer {
    constructor(dbConnectionDI) {
        this.dbConnectionDI = dbConnectionDI;
    }

    async fromBCAPIToDB(dbConfig, options, transportUtil, transportUtilType = 'hypernexus', overSSH = false, sshConfig = async () => ({})) {
        try {
            if (overSSH) {
                const sshConf = await sshConfig(process.env.SSH_HOST_REMOTE_CREDENTIAL, 'privatekey', process.env.SSH_CREDENTIAL_PASSPHRASE);
                const tunnel = await createTunnel(sshConf.tunnelOptions, sshConf.serverOptions, sshConf.sshOptions, sshConf.forwardOptions);
                console.log('tunnel connection established: ');
                // createSSHTunnel(sshConfig, 'privatekey', process.env.SSH_CREDENTIAL_PASSPHRASE);
            }
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

                await dbConn.close();
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
                setTimeout(async () => await this.fromBCAPIToDB(dbConfig, options, transportUtil, transportUtilType, overSSH, sshConfig), 3000);

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