import { readFile, open } from "node:fs/promises";
import { Readable } from "node:stream";
import readline from "node:readline";
import { createTunnel } from "tunnel-ssh";
import { getDBConnection } from "./database/get-database-connection.js";
import { conn } from "../../config/db.js";

// ---------- regex ----------
const insertRegex = /INSERT\s+IGNORE\s+INTO\s+`(\w+)`\s+\(([^)]+)\)\s+VALUES\s+(.+);/i;


// ---------- parser helpers ----------
function parseValuesSegment(valuesStr) {
    const rows = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < valuesStr.length; i++) {
        const ch = valuesStr[i];

        if (ch === "(") depth++;
        if (ch === ")") depth--;

        if (ch === "," && depth === 0) {
            rows.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }

    if (current) rows.push(current.trim());

    return rows.map(row => {
        const inner = row.replace(/^\(/, "").replace(/\)$/, "");
        const parts = [];
        let buf = "";
        let inStr = false;

        for (let i = 0; i < inner.length; i++) {
            const ch = inner[i];

            if (ch === "'" && inner[i - 1] !== "\\") {
                inStr = !inStr;
            }

            if (ch === "," && !inStr) {
                parts.push(buf.trim());
                buf = "";
            } else {
                buf += ch;
            }
        }
        if (buf) parts.push(buf.trim());

        return parts.map(p => p === "NULL" ? null : p.replace(/^'/, "").replace(/'$/, ""));
    });
}


// ---------- STREAM PARSER ----------
async function parseLogFile(filePath, onRow) {
    const fileHandle = await open(filePath, "r");
    const webStream = fileHandle.readableWebStream();
    const nodeStream = Readable.fromWeb(webStream);

    const rl = readline.createInterface({
        input: nodeStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.includes("INSERT IGNORE INTO")) continue;

        const match = insertRegex.exec(line);
        if (!match) continue;

        const table = match[1];
        const fields = match[2].split(",").map(f => f.replace(/`/g, "").trim());
        const rows = parseValuesSegment(match[3]);

        for (const row of rows) {
            const obj = {};
            for (let i = 0; i < fields.length; i++) {
                obj[fields[i]] = row[i] ?? null;
            }
            await onRow({ table, row: obj });
        }
    }
}


// ---------- MAIN ----------
export async function main(logFile) {
    if (!logFile) {
        console.error("Usage: node read-log.js /path/to/log.log");
        process.exit(1);
    }

    console.log("Parsing started…\n");

    // -----------------------------------
    // 1. Build SSH config once
    // -----------------------------------
    const sshConf = {
        tunnelOptions: { autoClose: true },
        serverOptions: {
            host: process.env.SSH_TUNNEL_LOCAL_HOST,
            port: Number(process.env.SSH_TUNNEL_LOCAL_PORT)
        },
        sshOptions: {
            username: process.env.SSH_HOST_REMOTE_USERNAME,
            host: process.env.SSH_HOST_REMOTE_ADDRESS,
            port: Number(process.env.SSH_HOST_REMOTE_PORT),
            privateKey: await readFile(process.env.SSH_HOST_REMOTE_CREDENTIAL),
            passphrase: process.env.SSH_CREDENTIAL_PASSPHRASE
        },
        forwardOptions: {
            srcAddr: process.env.SSH_HOST_LOCAL_SRC_HOST,
            srcPort: Number(process.env.SSH_HOST_LOCAL_SRC_PORT),
            dstAddr: process.env.SSH_HOST_REMOTE_DST_HOST,
            dstPort: Number(process.env.SSH_HOST_REMOTE_DST_PORT)
        }
    };

    // -----------------------------------
    // 2. Create tunnel once
    // -----------------------------------
    const tunnel = await createTunnel(
        sshConf.tunnelOptions,
        sshConf.serverOptions,
        sshConf.sshOptions,
        sshConf.forwardOptions
    );
    console.log("SSH tunnel ready.");

    // -----------------------------------
    // 3. Create DB connection once
    // -----------------------------------
    const dbConf = {
        type: "params",
        database: process.env.DEST_DB_DATABASE,
        username: process.env.DEST_DB_USERNAME,
        password: process.env.DEST_DB_PASSWORD,
        host: process.env.DEST_DB_HOST,
        port: process.env.DEST_DB_PORT,
        dialect: process.env.DEST_DB_DIALECT
    };

    const dbConn = getDBConnection(conn, "sequelize", dbConf, "source");
    console.log("DB ready.\n");

    // -----------------------------------
    // 4. Now parse
    // -----------------------------------
    await parseLogFile(logFile, async record => {
        if (record.table === "users") {
            const queryInterface = dbConn.getQueryInterface();
            const result = await queryInterface.sequelize.query(
                "SELECT * FROM `users` WHERE email = :email",
                {
                    replacements: { email: record.row.email },
                    type: queryInterface.sequelize.QueryTypes.SELECT
                }
            );
            const [res, metadata] = await queryInterface.sequelize.query('UPDATE profiles SET user_id = :user_id WHERE email = :email', {
                replacements: { email: result[0].email, user_id: result[0].id },
                type: queryInterface.sequelize.QueryTypes.UPDATE
            });
            console.log("FOUND:", result);

            console.log("UPDATED RECORD:", res);
        }
    });

    console.log("\nParsing complete.");
}


