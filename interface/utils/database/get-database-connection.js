export const getDBConnection = (connector, connectorType = 'sequelize', config = null, name = 'source') => {
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