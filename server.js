import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { conn } from './config/db.js'
import { readFile } from 'node:fs/promises'
import { createTunnel } from 'tunnel-ssh'

const app = express()
app.use(cors())

const port = 3501



const sshConfig = async (credential = null, authType = 'password', passphrase = null, conf = {
    tunnelOptions: {
        autoClose: true,
        reconnectOnError: true,
    },
    serverOptions: {
        host: process.env.SSH_TUNNEL_LOCAL_HOST,
        port: Number(process.env.SSH_TUNNEL_LOCAL_PORT),
    },
    sshOptions: {
        username: process.env.SSH_HOST_REMOTE_USERNAME,
        host: process.env.SSH_HOST_REMOTE_ADDRESS,
        port: Number(process.env.SSH_HOST_REMOTE_PORT),
    },
    forwardOptions: {
        srcAddr: process.env.SSH_HOST_LOCAL_SRC_HOST,
        srcPort: Number(process.env.SSH_HOST_LOCAL_SRC_PORT),
        dstAddr: process.env.SSH_HOST_REMOTE_DST_HOST,
        dstPort: Number(process.env.SSH_HOST_REMOTE_DST_PORT),
    }
}) => {
    authType = (authType || 'password').toLowerCase();
    switch (authType) {
        case 'password': {
            conf['sshOptions']['password'] = credential;
            break;
        }
        case 'privatekey': {
            conf['sshOptions']['privateKey'] = await readFile(credential);
            conf['sshOptions']['passphrase'] = passphrase;
            break;
        }
    }
    return conf;
};
const sshConf = await sshConfig(process.env.SSH_HOST_REMOTE_CREDENTIAL);
const tunnel = await createTunnel(sshConf.tunnelOptions, sshConf.serverOptions, sshConf.sshOptions, sshConf.forwardOptions);
console.log('tunnel connection established: ');

const getDBConnection = (connector, connectorType = 'sequelize', config = null, name = 'source') => {
    let conn = null;
    const c = (connectorType || '').toLowerCase();
    switch (c) {
        case 'sequelize': {
            if (config) {
                const { type, ...conf } = config;
                conn = connector(type, conf);
            } else {
                conn = connector();
            }
            try {
                if (!conn) {
                    console.error(`Unable to connect to the [${(name || '').toLocaleUpperCase()}]database:`)
                    process.exit(1)
                }
                conn.authenticate()
                console.log(`Connection to [${(name || '').toLocaleUpperCase()}] database has been established successfully.`)
            } catch (error) {
                console.error(`Unable to connect to the [${(name || '').toLocaleUpperCase()}] database:`, error)
                process.exit(1)
            }
        }
    }
    return conn;
}


// console.log(users)
const formatToMySQLDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};


const getDataFromSource = async (connectionQueryInterface, table, connectionType = 'mysql') => {
    // get data
    const db = connectionQueryInterface;
    let data = await db.select(null, table);

    // Get table column definitions to identify datetime columns
    const tableDescription = await db.describeTable(table);

    // Get DATETIME columns
    const datetimeColumns = Object.keys(tableDescription).filter(
        col => ['DATETIME', 'TIMESTAMP'].includes(tableDescription[col].type)
    );

    if (connectionType === 'mysql') {
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

const destinationDatabase = async (connectionQueryInterface, table, data, ignoreDuplicates = true, updateOnDuplicate = []) => {
    const db = connectionQueryInterface;
    const res = await db.bulkInsert(table, data, {
        ignoreDuplicates,
        updateOnDuplicate,
    });
    return res;
}
const source = getDBConnection(conn);
const dataSource = await getDataFromSource(source.getQueryInterface(), 'users');

// Destination DB:
const destDBConfig = {
    type: 'params',
    database: process.env.DEST_DB_USERNAME,
    username: process.env.DEST_DB_DATABASE,
    password: process.env.DEST_DB_PASSWORD,
    host: process.env.DEST_DB_HOST,
    port: process.env.DEST_DB_PORT,
    dialect: process.env.DEST_DB_DIALECT,
};

const destDBConnection = getDBConnection(conn, 'sequelize', destDBConfig, 'destination');

const data = dataSource.map((d) => {
    return {
        name: d.name,
        email: d.email,
        email_verified_at: d.email_verified_at,
        password: d.password,
        activated: d.status,
        phoneNo: d.phone_no,
        no: d.employee,
        address: d.address,
        searchName: d.searchName,
        name2: d.name2,
        address2: d.address2,
        city: d.city,
        contact: d.contact,
        telexNo: d.telexNo,
        b64Image: d.base64Image,
        avatar: d.avatar,
        homePage: d.homepage,
        county: d.county,
        postCode: d.postcode,
        vatRegistrationNo: d.vatRegistration,
        balanceLCY: d.balanceLCY,
        balance: d.balance,
        priority: d.priority,
        blocked: d.blocked,
        type: 'EMPLOYEE',
        remember_token: d.remember_token,
        created_at: d.created_at,
        updated_at: d.updated_at,
        default_company: d.default_company
    }
});
const fields = [
    "name",
    "email",
    "email_verified_at",
    "password",
    "activated",
    "phoneNo",
    "no",
    "address",
    "searchName",
    "name2",
    "address2",
    "city",
    "contact",
    "telexNo",
    "b64Image",
    "avatar",
    "homePage",
    "county",
    "postCode",
    "vatRegistrationNo",
    "balanceLCY",
    "balance",
    "priority",
    "blocked",
    "type",
    "remember_token",
    "created_at",
    "updated_at",
    "default_company"
];
const insertedRecords = await destinationDatabase(destDBConnection.getQueryInterface(), 'users', data, false, fields);
console.log('inserted data: ', insertedRecords);


// const laravelInsertFormat = processedUsers.map(user => ({
//     ...user,
//     // Add created_at/updated_at if needed
//     created_at: formatToMySQLDateTime(new Date()),
//     updated_at: formatToMySQLDateTime(new Date())
// }));
// console.log(laravelInsertFormat)

// const response = await axios.post(
//     'http://44.220.0.33:8001/api/v1/insert/settings',
//     laravelInsertFormat,
//     {
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     }
// )
// console.log("server response: ", response)
app.listen(port)