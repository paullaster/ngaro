import { Sequelize } from 'sequelize'
/**
 * 
 * @param {*} connectionType //connection types - params or uri
 * @param {*} config 
 * @returns 
 */
export const conn = (connectionType = 'params', config = {
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    uri: process.env.DB_URL,
}) => {
    connectionType = (connectionType || 'params').toLowerCase();
    switch (connectionType) {
        case 'params': {
            return new Sequelize(
                config.database,
                config.username,
                config.password,
                {
                    host: config.host,
                    port: config.port,
                    dialect: config.dialect,
                }
            );
        }
        case 'uri': {
            return new Sequelize(config.uri);
        }
    }
}