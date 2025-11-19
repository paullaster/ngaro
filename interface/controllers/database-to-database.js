import { createTunnel } from 'tunnel-ssh'
import { getDataFromSource } from '../utils/database/get-data-from-source-db.js';
import { insertRecords } from '../utils/database/insert-into-destination-db.js';

export class DBToDBTransfer {
    constructor(dbConnectionCb) {
        this.dbConnectionCb = dbConnectionCb;
    }
    async overSimilarSshSession(sshConfig, srcDBConfig, destDBConfig, options) {
        try {
            const sshConf = await sshConfig(process.env.SSH_HOST_REMOTE_CREDENTIAL);
            const tunnel = await createTunnel(sshConf.tunnelOptions, sshConf.serverOptions, sshConf.sshOptions, sshConf.forwardOptions);
            console.log('tunnel connection established: ');

            const sourceConn = this.dbConnectionCb(options.srcDBConnector, options.srcDBConnectorType ?? 'sequelize', srcDBConfig);
            const destConn = this.dbConnectionCb(options.destDBConnector, options.destDBConnectorType ?? 'sequelize', destDBConfig, 'destination');

            const dataFromSource = await getDataFromSource(sourceConn.getQueryInterface(), options.sourceTable, options.sourceConnectionType ?? 'mysql');

            const mappedFields = options.fieldsMapper(dataFromSource);

            const records = insertRecords(destConn.getQueryInterface(), options.destTable, mappedFields, options.destIgnoreDuplicates ?? false, options.destFieldToUpdateOnDuplicate ?? []);
            return records;
        } catch (error) {
            console.error(`[OVER SAME SSH SESSION]: `, error);
        }
    }

}