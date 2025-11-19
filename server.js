import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { conn } from './config/db.js'
import { readFile } from 'node:fs/promises'
import { DBToDBTransfer } from './interface/controllers/database-to-database.js'
import { getDBConnection } from './interface/utils/database/get-database-connection.js'
import { DataTransfer } from './interface/controllers/data-transfer.js'
import { transport } from '@brainspore/hypernexus'
import { formatToMySQLDateTime } from './interface/utils/database/mysql-datetime-formartter.js'
import { logger } from '@brainspore/hypernexus/dist/src/utils/logger.js'
import { main } from './interface/utils/read-log.js'

const app = express()
app.use(cors())

const port = 3501


const newDbToDbTransfer = new DBToDBTransfer(getDBConnection);

const newDataTransfer = new DataTransfer(getDBConnection);

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

const destDBConfig = {
    type: 'params',
    database: process.env.DEST_DB_DATABASE,
    username: process.env.DEST_DB_USERNAME,
    password: process.env.DEST_DB_PASSWORD,
    host: process.env.DEST_DB_HOST,
    port: process.env.DEST_DB_PORT,
    dialect: process.env.DEST_DB_DIALECT,
    options: {
        logging: (...msg) => logger.debug(msg),
    }
};

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

const options = {
    sourceTable: 'users',
    fieldsMapper: (data) => data.map((d) => ({
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
    })),
    destTable: 'user',
    destFieldToUpdateOnDuplicate: [
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
    ],
    destDBConnector: conn,
    srcDBConnector: conn,

}

// console.log('inserted data', await newDbToDbTransfer.overSimilarSshSession(sshConfig, null, destDBConfig, options))
const d_pass = '$2y$10$mMSbPcB9xKn8AZX/pGBQL.dVyQXtfmPf5Chgz4zlSJieLmS577sZu';

// await newDataTransfer.fromBCAPIToDB(destDBConfig, {
//     db: {
//         connector: conn,
//         tables: [
//             {
//                 name: 'users',
//                 prepareData: (data) => {
//                     return data.map((d) => {
//                         if (d.userApplicationRequest[0]) {
//                             return {
//                                 name: `${d.FirstName} ${d.SecondName} ${d.LastName}`,
//                                 id_number: d.IdentificationDocumentNo,
//                                 email: d.Email,
//                                 type: d.type ?? 'Individual',
//                                 application_type: d.userApplicationRequest[0].Applied_Category,
//                                 password: d_pass,
//                                 admin: 0,
//                                 profile_status: 'new',
//                                 created_at: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 updated_at: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 is_admin: 0,
//                                 showRelease: 0,
//                                 synched: 0,
//                                 phone_number: d.PhoneNo,
//                                 ProfileID: d.ProfileID,
//                             }
//                         }
//                     }).filter((f) => f && f)
//                 }
//             },
//             {
//                 name: 'profiles',
//                 prepareData: (data) => {
//                     return data.map((d) => {
//                         if (d.userApplicationRequest[0]) {
//                             return {
//                                 ProfileID: d.ProfileID,
//                                 user_id: Math.floor(Math.random() * 1000000),
//                                 FirstName: `${d.FirstName}`,
//                                 SecondName: `${d.SecondName}`,
//                                 LastName: `${d.LastName}`,
//                                 SearchName: d.SearchName,
//                                 DateOfBirth: d.DateOfBirth,
//                                 Email: d.Email,
//                                 PhoneNo: d.PhoneNo,
//                                 Nationality: d.Nationality,
//                                 IdentificationDocumentNo: d.IdentificationDocumentNo,
//                                 Gender: d.Gender,
//                                 MaritalStatus: d.MaritalStatus,
//                                 MemberShipType: d.userApplicationRequest[0].Applied_Category,
//                                 City: d.City,
//                                 Address: d.Address,
//                                 WebSite: d.WebSite,
//                                 countryCode: d.countryCode,
//                                 ApplicationPurpose: d.ApplicationPurpose,
//                                 intendToWorkLocally: 0,
//                                 ProfileComplete: 0,
//                                 Synched: 0,
//                                 created_at: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 updated_at: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 InGoodStanding: d.InGoodStanding,
//                                 regionCode: d.regionCode,
//                                 branchCode: d.branchCode
//                             }
//                         }
//                     }).filter((f) => f && f)
//                 }
//             },
//             {
//                 name: 'application_requests',
//                 prepareData: (data) => {
//                     return data.map((d) => {
//                         if (d.userApplicationRequest[0]) {
//                             return {
//                                 created_at: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 updated_at: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 ProfileID: d.ProfileID,
//                                 Code: d.userApplicationRequest[0].Code,
//                                 Amount: d.userApplicationRequest[0].Amount,
//                                 AppliedCategory: d.userApplicationRequest[0].Applied_Category,
//                                 ApplicationDateTime: formatToMySQLDateTime(d.userApplicationRequest[0].Application_DateTime),
//                                 SubscriptionPeriod: d.Subscription_Period,
//                                 Synched: 0,
//                             }
//                         }
//                     }).filter((f) => f && f)
//                 }
//             }
//         ]
//     },
//     bc: {
//         endpoint: '/api/KineticTechnology/Membership/v2.0/userProfile',
//         query: {
//             '$filter': "status eq 'New' and type eq 'Individual'",
//             '$expand': 'userApplicationRequest',
//         },
//         transportOptions: {
//             headers: {
//                 Prefer: "maxpagesize=100"
//             }
//         }
//     },
// }, transport, 'hypernexus', true, sshConfig);

main('node_modules/@brainspore/hypernexus/dist/storage/logs/log-2025-11-19.log');

app.listen(port)